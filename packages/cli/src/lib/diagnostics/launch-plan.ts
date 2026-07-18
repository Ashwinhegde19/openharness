import os from "node:os";
import { ALL_HARNESSES, HARNESS, HARNESS_LABEL, type HarnessId } from "../harness.js";
import { peelProductFlags } from "../cli-flags.js";
import type { HarnessContext } from "../harness-types.js";
import {
  OLLAMA_PROVIDER_ID,
  OPENROUTER_PROVIDER_ID,
  TOGETHER_PROVIDER_ID,
  getBuiltinProvider,
  isBuiltinProviderId,
} from "../provider/index.js";
import { OPENROUTER_API_KEY_ENV } from "../provider/openrouter-preset.js";
import { planOpencodeLaunch } from "../harnesses/opencode.js";
import { readGlobalConfig, resolveStoredOpenRouterApiKey } from "../global-config.js";
import { resolveTogetherApiKey } from "../together-core.js";
import type { LaunchPlan } from "./types.js";

export type DryRunOptions = {
  json?: boolean;
  /** When true, a missing provider key is a warning rather than an error preview. */
  preview?: boolean;
};

/**
 * Resolve the launch plan for a harness invocation WITHOUT spawning anything.
 * Secrets are never included: provider configs use `{env:…}` refs, and only env
 * var names (not values) are reported.
 */
export async function buildLaunchPlan(
  harnessArg: string | undefined,
  ctx: HarnessContext,
  options: DryRunOptions = {},
): Promise<LaunchPlan> {
  const empty: LaunchPlan = {
    harness: harnessArg ?? "",
    harnessLabel: harnessArg ? (HARNESS_LABEL[harnessArg as HarnessId] ?? harnessArg) : "",
    family: "spawned",
    provider: "",
    providerLabel: "",
    baseURL: "",
    model: "",
    sessionOnly: true,
    cloudDestination: false,
    auth: { type: "none", required: false, keyPresent: false },
    envPreview: [],
    passthrough: ctx.passthrough ?? [],
    notes: [],
    warnings: [],
    errors: [],
  };

  if (!harnessArg || !(ALL_HARNESSES as readonly string[]).includes(harnessArg)) {
    empty.errors.push(
      `Unknown harness "${harnessArg ?? ""}". Supported: ${ALL_HARNESSES.join(", ")}.`,
    );
    return empty;
  }

  const harness = harnessArg as HarnessId;

  if (harness === HARNESS.OPENCODE) {
    return mapOpencodePlan(await planOpencodeLaunch(ctx, { preview: options.preview ?? true }));
  }

  return mapProxiedPlan(harness, ctx);
}

function mapOpencodePlan(plan: Awaited<ReturnType<typeof planOpencodeLaunch>>): LaunchPlan {
  const providerId = plan.provider?.id ?? "";
  return {
    harness: HARNESS.OPENCODE,
    harnessLabel: HARNESS_LABEL[HARNESS.OPENCODE],
    family: "spawned",
    provider: providerId,
    providerLabel: plan.provider?.label ?? "",
    baseURL: plan.provider?.baseURL ?? "",
    model: plan.modelId ?? "",
    sessionOnly: true,
    cloudDestination: plan.cloudDestination,
    auth: {
      type: plan.provider?.auth.type ?? "none",
      required: plan.provider?.auth.type !== "none",
      ...(plan.apiKeyEnv !== undefined ? { apiKeyEnv: plan.apiKeyEnv } : {}),
      keyPresent: plan.keyPresent,
    },
    configPreview: plan.configJson as unknown as Record<string, unknown> | undefined,
    envPreview: [
      "OPENCODE_CONFIG_CONTENT",
      ...(plan.apiKeyEnv && plan.keyPresent ? [plan.apiKeyEnv] : []),
    ],
    passthrough: plan.args,
    notes: [],
    warnings: plan.warnings,
    errors: plan.errors,
  };
}

/**
 * Build a preview for the proxied harnesses (Claude, Codex, Pi) from provider
 * presets. They launch a session-scoped local proxy and never write harness
 * config, so the plan describes the provider routing rather than an inline config.
 */
async function mapProxiedPlan(harness: HarnessId, ctx: HarnessContext): Promise<LaunchPlan> {
  const peeled = peelProductFlags(ctx.passthrough ?? []);
  const providerId = (ctx.provider ?? TOGETHER_PROVIDER_ID).trim().toLowerCase();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isBuiltinProviderId(providerId) && providerId !== "togetherai") {
    errors.push(`Unknown provider "${ctx.provider}". Supported: ollama, openrouter, together.`);
  }

  const provider = getBuiltinProvider(
    providerId === "togetherai" ? TOGETHER_PROVIDER_ID : providerId,
  );
  if (!provider) {
    return {
      harness,
      harnessLabel: HARNESS_LABEL[harness],
      family: "proxied",
      provider: providerId,
      providerLabel: "",
      baseURL: "",
      model: "",
      sessionOnly: true,
      cloudDestination: false,
      auth: { type: "none", required: false, keyPresent: false },
      envPreview: [],
      passthrough: peeled.rest,
      notes: [],
      warnings,
      errors: errors.length ? errors : [`Provider "${providerId}" preset is missing.`],
    };
  }

  const requested = peeled.main?.trim() || ctx.main?.trim();
  const model = requested || provider.models[0]?.id || "default";

  const keyPresent = await proxiedKeyPresent(providerId, ctx);
  const cloudDestination = providerId === OPENROUTER_PROVIDER_ID;

  if (provider.auth.type !== "none" && !keyPresent) {
    warnings.push(
      `No ${provider.auth.apiKeyEnv ?? "API key"} found. ` +
        `Set it or run \`openharness configure\` before launching for real.`,
    );
  }

  return {
    harness,
    harnessLabel: HARNESS_LABEL[harness],
    family: "proxied",
    provider: provider.id,
    providerLabel: provider.label,
    baseURL: provider.baseURL,
    model,
    sessionOnly: true,
    cloudDestination,
    auth: {
      type: provider.auth.type,
      required: provider.auth.type !== "none",
      ...(provider.auth.type !== "none" ? { apiKeyEnv: provider.auth.apiKeyEnv } : {}),
      keyPresent,
    },
    configPreview: undefined,
    envPreview: ["(session-scoped proxy env — no permanent harness config)"],
    passthrough: peeled.rest,
    notes: [
      "Launches a session-scoped local proxy; the harness config is not permanently modified.",
      ...(cloudDestination ? ["Cloud destination: prompts leave this machine (OpenRouter)."] : []),
    ],
    warnings,
    errors,
  };
}

async function proxiedKeyPresent(providerId: string, ctx: HarnessContext): Promise<boolean> {
  if (providerId === OLLAMA_PROVIDER_ID) {
    return true;
  }
  if (providerId === OPENROUTER_PROVIDER_ID) {
    if (process.env[OPENROUTER_API_KEY_ENV]?.trim()) {
      return true;
    }
    try {
      const stored = resolveStoredOpenRouterApiKey(
        (await readGlobalConfig(ctx.home ?? os.homedir())).openrouterApiKey,
      );
      return Boolean(stored);
    } catch {
      return false;
    }
  }
  const key = await resolveTogetherApiKey({ apiKey: ctx.apiKey, home: ctx.home });
  return Boolean(key);
}

/** Run `dry-run` for a harness and print the redacted launch plan. */
export async function runDryRun(
  harnessArg: string | undefined,
  ctx: HarnessContext,
  options: DryRunOptions = {},
): Promise<void> {
  const plan = await buildLaunchPlan(harnessArg, ctx, options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }
  printLaunchPlan(plan);
}

function printLaunchPlan(plan: LaunchPlan): void {
  console.log(`Launch plan: ${plan.harnessLabel || plan.harness} (${plan.family})`);
  console.log("─".repeat(48));
  const rows: Array<[string, string]> = [
    ["provider", plan.provider ? `${plan.providerLabel} (${plan.provider})` : "—"],
    ["base URL", plan.baseURL || "—"],
    ["model", plan.model || "—"],
    ["session-only", plan.sessionOnly ? "yes (no permanent config)" : "no"],
    [
      "cloud destination",
      plan.cloudDestination ? "yes — prompts leave this machine" : "no (local/on-prem)",
    ],
    [
      "auth",
      plan.auth.type === "none"
        ? "none (no key)"
        : `${plan.auth.type}${plan.auth.required ? " (required)" : ""} · ` +
          `key ${plan.auth.keyPresent ? "present" : "absent"}${plan.auth.apiKeyEnv ? ` (${plan.auth.apiKeyEnv})` : ""}`,
    ],
  ];
  for (const [key, value] of rows) {
    console.log(`  ${key.padEnd(16)} ${value}`);
  }
  if (plan.envPreview.length > 0) {
    console.log(`  env vars          ${plan.envPreview.join(", ")}`);
  }
  if (plan.passthrough.length > 0) {
    console.log(`  passthrough        ${plan.passthrough.join(" ")}`);
  }
  if (plan.configPreview) {
    console.log("  config (redacted):");
    console.log(`    ${JSON.stringify(plan.configPreview)}`);
  }
  for (const note of plan.notes) {
    console.log(`  • ${note}`);
  }
  for (const warning of plan.warnings) {
    console.log(`  ! ${warning}`);
  }
  for (const error of plan.errors) {
    console.log(`  ✗ ${error}`);
  }
  console.log("─".repeat(48));
  console.log(
    plan.errors.length > 0
      ? "Plan has errors — not ready to launch."
      : "Plan ready (preview only — nothing launched).",
  );
}
