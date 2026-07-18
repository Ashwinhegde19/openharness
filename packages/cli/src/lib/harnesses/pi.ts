import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { CODEX_SUPPORTED_MODELS, resolveCodexModel } from "../codex/defaults.js";
import { HARNESS } from "../harness.js";
import { defineHarness, type HarnessContext, type HarnessResult } from "../harness-types.js";
import { resolveTogetherApiKey } from "../together-core.js";

const PI_PROVIDER_ID = "together";
const PI_SUPPORTED_MODELS = CODEX_SUPPORTED_MODELS.map((model) => model.id).join(",");

const VALUE_FLAGS = new Set(["--api-key", "--provider", "--model", "--models"]);

function piArgsWithoutOpenharnessOverrides(args: string[]): string[] {
  const sanitized: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (VALUE_FLAGS.has(arg)) {
      i += 1;
      continue;
    }
    if (
      arg.startsWith("--api-key=") ||
      arg.startsWith("--provider=") ||
      arg.startsWith("--model=") ||
      arg.startsWith("--models=")
    ) {
      continue;
    }
    sanitized.push(arg);
  }
  return sanitized;
}

function writePiModelsJson(agentDir: string, apiKey: string): void {
  const models = CODEX_SUPPORTED_MODELS.map(({ definition }) => ({
    id: definition.id,
    name: definition.name,
    reasoning: definition.reasoning,
    input: definition.modalities.input,
    contextWindow: definition.limit.context,
    maxTokens: definition.limit.output,
    cost: {
      input: definition.cost.input,
      output: definition.cost.output,
      cacheRead: definition.cost.cache_read ?? 0,
      cacheWrite: 0,
    },
  }));

  // M2 follow-up: the temp models.json carries the Together API key in
  // plaintext for the launched Pi process. The agent dir is already 0700
  // (mkdtempSync), but write with 0600 so the key file is never
  // group/world-readable. The dir is removed on exit (best-effort).
  writeFileSync(
    join(agentDir, "models.json"),
    `${JSON.stringify(
      {
        providers: {
          [PI_PROVIDER_ID]: {
            apiKey,
            models,
          },
        },
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

export default defineHarness({
  id: HARNESS.PI,
  label: "Pi Code",

  async run(ctx: HarnessContext): Promise<HarnessResult> {
    const apiKey = await resolveTogetherApiKey({
      apiKey: ctx.apiKey,
      home: ctx.home,
    });
    if (!apiKey) {
      throw new Error(
        "Pi currently uses the Together provider preset and needs a key. " +
          "Pass --api-key, set TOGETHER_API_KEY, or run `openharness configure`. " +
          "For local models without a cloud key: `openharness opencode` (Ollama).",
      );
    }

    const agentDir = mkdtempSync(join(tmpdir(), "openharness-pi-"));
    const sessionDir =
      process.env.PI_CODING_AGENT_SESSION_DIR ??
      join(ctx.home || homedir(), ".pi", "agent", "sessions");
    writePiModelsJson(agentDir, apiKey);
    const selectedModel = resolveCodexModel(ctx.main);
    const args = [
      "--provider",
      PI_PROVIDER_ID,
      "--model",
      selectedModel.id,
      "--models",
      PI_SUPPORTED_MODELS,
      "--api-key",
      apiKey,
      "--no-approve",
      "--no-extensions",
      "--no-skills",
      "--no-prompt-templates",
      "--no-themes",
      ...piArgsWithoutOpenharnessOverrides(ctx.passthrough ?? []),
    ];

    if (process.env.OPENHARNESS_DEBUG === "1") {
      process.stderr.write(`[openharness pi] provider: ${PI_PROVIDER_ID}\n`);
      process.stderr.write(`[openharness pi] model: ${selectedModel.id}\n`);
      process.stderr.write(`[openharness pi] models: ${PI_SUPPORTED_MODELS}\n`);
      process.stderr.write(`[openharness pi] temp config dir: ${agentDir}\n`);
      process.stderr.write(`[openharness pi] session dir: ${sessionDir}\n`);
    }

    process.stderr.write(`openharness ▸ Launching Pi Code with Together AI.\n`);
    const child = spawn("pi", args, {
      env: {
        ...process.env,
        PI_CODING_AGENT_DIR: agentDir,
        PI_CODING_AGENT_SESSION_DIR: sessionDir,
        TOGETHER_API_KEY: apiKey,
      },
      stdio: "inherit",
    });

    const result = await new Promise<{ status: number | null; signal: NodeJS.Signals | null }>(
      (resolve) => {
        child.on("error", (err) => {
          process.stderr.write(`openharness ▸ Failed to launch pi: ${err.message}.\n`);
          resolve({ status: 1, signal: null });
        });
        child.on("exit", (status, signal) => resolve({ status, signal }));
      },
    );

    try {
      rmSync(agentDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }

    if (typeof result.status === "number") {
      process.exitCode = result.status;
    }
    return {};
  },
});
