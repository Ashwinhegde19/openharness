import os from "node:os";
import {
  ALL_HARNESSES,
  HARNESS_INSTALL,
  HARNESS_LABEL,
  type HarnessId,
} from "../harness.js";
import { detectInstalledHarnesses } from "../detect.js";
import { discoverOllamaModels, type OllamaDiscoveryResult } from "../provider/ollama-discovery.js";
import { OLLAMA_PROVIDER_ID, OPENROUTER_PROVIDER_ID, TOGETHER_PROVIDER_ID } from "../provider/index.js";
import { OPENROUTER_API_KEY_ENV } from "../provider/openrouter-preset.js";
import {
  readGlobalConfig,
  resolveStoredApiKey,
  resolveStoredOpenRouterApiKey,
  resolveStoredExaApiKey,
} from "../global-config.js";
import { VERSION } from "../version.js";
import type { DoctorCheck, DoctorReport, DoctorSeverity } from "./types.js";

const SEVERITY_RANK: Record<DoctorSeverity, number> = {
  ok: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const PRODUCT_NAME = "openharness";

export type DoctorOptions = {
  /** Emit the structured report as JSON. */
  json?: boolean;
  /** Override the home directory (mostly for tests). */
  home?: string;
  /** Inject a fetch implementation (mostly for tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
};

/**
 * Collect environment + configuration diagnostics: installed harnesses, provider
 * reachability / key availability, and a first-run recommendation. Never throws —
 * a failed network probe or missing harness is reported as a check, not an error.
 */
export async function collectDoctorReport(options: DoctorOptions = {}): Promise<DoctorReport> {
  const home = options.home ?? os.homedir();
  const checks: DoctorCheck[] = [];

  checks.push(...harnessChecks());
  await collectProviderChecks(checks, { home, fetchImpl: options.fetchImpl });

  const status = checks.reduce<DoctorSeverity>(
    (worst, check) => (SEVERITY_RANK[check.severity] > SEVERITY_RANK[worst] ? check.severity : worst),
    "ok",
  );

  const installed = checks
    .filter((c) => c.id.startsWith("harness:") && (c.severity === "ok" || c.severity === "info"))
    .map((c) => c.id.replace("harness:", ""));
  const ollamaReachable = checks.some((c) => c.id === `provider:${OLLAMA_PROVIDER_ID}` && c.severity === "ok");
  const togetherKey = checks.some((c) => c.id === `provider:${TOGETHER_PROVIDER_ID}` && c.severity === "ok");
  const recommendation = buildRecommendation({ installed, ollamaReachable, togetherKey });

  return {
    product: PRODUCT_NAME,
    version: VERSION,
    platform: `${process.platform} ${process.arch}`,
    generatedAt: new Date().toISOString(),
    status,
    recommendation,
    checks,
  };
}

/** Run `doctor` and print to stdout (JSON when requested). */
export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
  const report = await collectDoctorReport(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  printDoctorReport(report);
}

function harnessChecks(): DoctorCheck[] {
  const detected = detectInstalledHarnesses();
  return ALL_HARNESSES.map((harness: HarnessId) => {
    const found = detected[harness].installed;
    const install = HARNESS_INSTALL[harness];
    return {
      id: `harness:${harness}`,
      label: `${HARNESS_LABEL[harness]} installed`,
      severity: found ? "ok" : "warn",
      detail: found
        ? `Found at ${detected[harness].path}`
        : `Not found on PATH. ${HARNESS_LABEL[harness]} is required to launch through it.`,
      ...(found
        ? {}
        : {
            fix: `Install with: ${install.command}\n    Docs: ${install.url}`,
          }),
    };
  });
}

async function collectProviderChecks(
  checks: DoctorCheck[],
  options: { home: string; fetchImpl?: typeof fetch | undefined },
): Promise<void> {
  // Ollama — local, no key; check reachability via discovery.
  const discovery = await probeOllama(options.fetchImpl);
  checks.push({
    id: `provider:${OLLAMA_PROVIDER_ID}`,
    label: "Ollama reachable (local, no key)",
    severity: discovery.ok ? "ok" : "warn",
    detail: discovery.ok
      ? `Local Ollama at ${discovery.baseURL} reports ${discovery.models.length} model(s).`
      : `${discovery.error}`,
    ...(discovery.ok
      ? {}
      : { fix: "Start Ollama with `ollama serve`, then `ollama pull llama3.2`." }),
  });

  // OpenRouter / Together — key presence only (no network, no secret exposure).
  const openrouter = await keyStatus(OPENROUTER_API_KEY_ENV, async () => {
    const stored = resolveStoredOpenRouterApiKey(
      (await readGlobalConfig(options.home)).openrouterApiKey,
    );
    return stored;
  });
  checks.push({
    id: `provider:${OPENROUTER_PROVIDER_ID}`,
    label: "OpenRouter API key",
    severity: openrouter.present ? "ok" : "info",
    detail: openrouter.present
      ? `Found via ${openrouter.source}. Optional — needed for \`--provider openrouter\`.`
      : "Not set. Optional — set OPENROUTER_API_KEY or run `togetherlink configure`.",
  });

  const together = await keyStatus("TOGETHER_API_KEY", async () => {
    const stored = resolveStoredApiKey((await readGlobalConfig(options.home)).apiKey);
    return stored;
  });
  checks.push({
    id: `provider:${TOGETHER_PROVIDER_ID}`,
    label: "Together API key",
    severity: together.present ? "ok" : "info",
    detail: together.present
      ? `Found via ${together.source}. Optional — Together is one preset, not required.`
      : "Not set. Optional — Together is one preset; OpenCode defaults to local Ollama.",
  });

  const exa = await keyStatus("EXA_API_KEY", async () => {
    const stored = resolveStoredExaApiKey((await readGlobalConfig(options.home)).exaApiKey);
    return stored;
  });
  checks.push({
    id: "provider:exa",
    label: "Exa API key (Claude web search)",
    severity: exa.present ? "ok" : "info",
    detail: exa.present
      ? `Found via ${exa.source}. Enables web_search in the Claude proxy.`
      : "Not set. Optional — only enables web_search in the Claude proxy.",
  });

  checks.push({
    id: "product:no-global-key",
    label: "No global provider key required",
    severity: "ok",
    detail: "The product launches without a product-level API key; credentials are per-provider at launch.",
  });
}

async function probeOllama(fetchImpl?: typeof fetch): Promise<OllamaDiscoveryResult> {
  try {
    return await discoverOllamaModels(fetchImpl ? { fetchImpl } : undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, baseURL: "", error: message };
  }
}

async function keyStatus(
  envName: string,
  resolveStored: () => Promise<string>,
): Promise<{ present: boolean; source: string }> {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return { present: true, source: `env:${envName}` };
  }
  try {
    const stored = (await resolveStored())?.trim();
    if (stored) {
      return { present: true, source: "global config" };
    }
  } catch {
    // No global config yet — not an error.
  }
  return { present: false, source: "" };
}

function buildRecommendation(input: {
  installed: string[];
  ollamaReachable: boolean;
  togetherKey: boolean;
}): string {
  if (input.installed.length === 0) {
    return (
      "Install a harness to begin. The lowest-friction first run is OpenCode + local Ollama " +
      "(no API key): `npm install -g opencode-ai@latest`, `ollama serve`, `ollama pull llama3.2`, " +
      "then `togetherlink opencode`."
    );
  }
  if (input.installed.includes(OLLAMA_PROVIDER_ID) && input.ollamaReachable) {
    return "Ready: run `togetherlink opencode` to start a local Ollama session (no API key).";
  }
  if (input.installed.includes(OLLAMA_PROVIDER_ID)) {
    return (
      "OpenCode is installed but Ollama is not reachable. Start it with `ollama serve` and pull a " +
      "model (`ollama pull llama3.2`), then run `togetherlink opencode` (no API key)."
    );
  }
  if ((input.installed.includes("claude") || input.installed.includes("codex")) && input.togetherKey) {
    const harness = input.installed.includes("claude") ? "claude" : "codex";
    return `Run \`togetherlink ${harness}\` to start a Together session (key detected).`;
  }
  return (
    "A harness is installed but no provider key is set. For a keyless start, install OpenCode + Ollama " +
    "(`togetherlink opencode`). For cloud providers, set a key or run `togetherlink configure`."
  );
}

function printDoctorReport(report: DoctorReport): void {
  const icon: Record<DoctorSeverity, string> = {
    ok: "✓",
    info: "ℹ",
    warn: "!",
    error: "✗",
  };
  console.log(`openharness doctor v${report.version} (${report.platform})`);
  console.log("─".repeat(48));
  for (const check of report.checks) {
    const line = ` ${icon[check.severity]} ${check.label}`;
    console.log(line);
    console.log(`   ${check.detail}`);
    if (check.fix) {
      console.log(`   fix: ${check.fix}`);
    }
  }
  console.log("─".repeat(48));
  const summary = report.status === "error" ? "errors found" : report.status === "warn" ? "warnings" : "ok";
  console.log(`Status: ${summary}`);
  console.log(`Next: ${report.recommendation}`);
}
