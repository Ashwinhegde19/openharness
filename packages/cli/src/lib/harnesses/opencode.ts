import { spawn } from "node:child_process";
import { OPENCODE_DEFAULT_MODEL } from "../opencode/defaults.js";
import {
  buildOpencodeConfigJson,
  buildOpencodeEnv,
  isSessionOnlyOpencodeLaunch,
  opencodeProviderIdFor,
  type OpencodeConfig,
} from "../opencode/core.js";
import { resolveTogetherApiKey } from "../together-core.js";
import { defineHarness } from "../harness-types.js";
import { HARNESS } from "../harness.js";
import type { HarnessContext, HarnessResult } from "../harness-types.js";
import {
  OLLAMA_PROVIDER_ID,
  OPENROUTER_API_KEY_ENV,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_PROVIDER_ID,
  TOGETHER_PROVIDER_ID,
  buildOllamaProviderConfig,
  buildOpenRouterProviderConfig,
  discoverOllamaModels,
  discoverOpenRouterModels,
  getBuiltinProvider,
  isBuiltinProviderId,
  mergeOpenRouterCatalog,
  ollamaModelFromId,
  type ProviderConfig,
} from "../provider/index.js";

/**
 * Product flags that may appear after `opencode` in the argv (users often write
 * `openharness opencode --provider ollama`). Peel them into context so they
 * are not forwarded to the native binary.
 */
function peelProductFlags(args: string[]): {
  rest: string[];
  provider?: string;
  baseUrl?: string;
  main?: string;
  apiKey?: string;
} {
  const rest: string[] = [];
  let provider: string | undefined;
  let baseUrl: string | undefined;
  let main: string | undefined;
  let apiKey: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--provider" || arg.startsWith("--provider=")) {
      const value = arg.includes("=") ? arg.slice("--provider=".length) : args[++i];
      if (value) {
        provider = value;
      }
      continue;
    }
    if (arg === "--base-url" || arg.startsWith("--base-url=")) {
      const value = arg.includes("=") ? arg.slice("--base-url=".length) : args[++i];
      if (value) {
        baseUrl = value;
      }
      continue;
    }
    if (
      arg === "--main" ||
      arg === "--model" ||
      arg === "-m" ||
      arg.startsWith("--main=") ||
      arg.startsWith("--model=")
    ) {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : args[++i];
      if (value) {
        main = value;
      }
      continue;
    }
    if (arg === "--api-key" || arg.startsWith("--api-key=")) {
      const value = arg.includes("=") ? arg.slice("--api-key=".length) : args[++i];
      if (value) {
        apiKey = value;
      }
      continue;
    }
    rest.push(arg);
  }
  return {
    rest,
    ...(provider !== undefined ? { provider } : {}),
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    ...(main !== undefined ? { main } : {}),
    ...(apiKey !== undefined ? { apiKey } : {}),
  };
}

/** Remaining strip for any model flags that escaped peeling. */
function opencodeArgsWithoutModelOverrides(args: string[]): string[] {
  const sanitized: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--model" || arg === "-m") {
      i += 1;
      continue;
    }
    if (arg.startsWith("--model=")) {
      continue;
    }
    sanitized.push(arg);
  }
  return sanitized;
}

/** OpenCode default when --provider is omitted: local Ollama (no API key). */
export const OPENCODE_DEFAULT_PROVIDER_ID = OLLAMA_PROVIDER_ID;

async function resolveProviderForLaunch(ctx: HarnessContext): Promise<ProviderConfig> {
  const providerId = (ctx.provider ?? OPENCODE_DEFAULT_PROVIDER_ID).trim().toLowerCase();
  if (!isBuiltinProviderId(providerId) && providerId !== "togetherai") {
    throw new Error(`Unknown provider "${ctx.provider}". Supported: ollama, openrouter, together.`);
  }

  if (providerId === OLLAMA_PROVIDER_ID) {
    return resolveOllamaProvider(ctx);
  }
  if (providerId === OPENROUTER_PROVIDER_ID) {
    return resolveOpenRouterProvider(ctx);
  }

  const together = getBuiltinProvider(TOGETHER_PROVIDER_ID);
  if (!together) {
    throw new Error("Together provider preset is missing from the registry.");
  }
  return together;
}

async function resolveOllamaProvider(ctx: HarnessContext): Promise<ProviderConfig> {
  const baseURL = ctx.baseUrl?.trim();
  const discovery = await discoverOllamaModels({
    ...(baseURL ? { baseURL } : {}),
  });

  const requested = ctx.main?.trim();
  if (!discovery.ok) {
    if (requested) {
      process.stderr.write(
        `openharness ▸ Warning: ${discovery.error} Using --main ${requested} without discovery.\n`,
      );
      return buildOllamaProviderConfig({
        baseURL: discovery.baseURL,
        models: [ollamaModelFromId(requested)],
      });
    }
    throw new Error(discovery.error);
  }

  let models = discovery.models;
  if (requested && !models.some((m) => m.id === requested)) {
    models = [ollamaModelFromId(requested), ...models];
    process.stderr.write(
      `openharness ▸ Model "${requested}" was not in Ollama's catalog; ` +
        `including it anyway. If launch fails, run \`ollama pull ${requested}\`.\n`,
    );
  }

  return buildOllamaProviderConfig({
    baseURL: discovery.baseURL,
    models,
  });
}

async function resolveOpenRouterProvider(ctx: HarnessContext): Promise<ProviderConfig> {
  const apiKey = await resolveOpenRouterApiKey(ctx);
  if (!apiKey) {
    throw new Error(
      "No OpenRouter API key found. Pass --api-key or set OPENROUTER_API_KEY " +
        "(https://openrouter.ai/keys).",
    );
  }

  const baseURL = ctx.baseUrl?.trim();
  const discovery = await discoverOpenRouterModels({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const requested = ctx.main?.trim();
  if (!discovery.ok) {
    process.stderr.write(
      `openharness ▸ Warning: ${discovery.error} Using curated OpenRouter catalog.\n`,
    );
    return buildOpenRouterProviderConfig({
      baseURL: discovery.baseURL,
      models: mergeOpenRouterCatalog({ requested }),
    });
  }

  return buildOpenRouterProviderConfig({
    baseURL: discovery.baseURL,
    models: mergeOpenRouterCatalog({
      discovered: discovery.models,
      requested,
    }),
  });
}

async function resolveOpenRouterApiKey(ctx: HarnessContext): Promise<string> {
  if (ctx.apiKey?.trim()) {
    return ctx.apiKey.trim();
  }
  const fromEnv = process.env[OPENROUTER_API_KEY_ENV]?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (ctx.home) {
    const { readGlobalConfig, resolveStoredOpenRouterApiKey } = await import("../global-config.js");
    const stored = resolveStoredOpenRouterApiKey(
      (await readGlobalConfig(ctx.home)).openrouterApiKey,
    );
    if (stored) {
      return stored;
    }
  }
  return "";
}

function defaultModelForProvider(provider: ProviderConfig, requested?: string): string {
  if (requested?.trim()) {
    return requested.trim();
  }
  if (provider.id === TOGETHER_PROVIDER_ID) {
    return OPENCODE_DEFAULT_MODEL;
  }
  if (provider.id === OPENROUTER_PROVIDER_ID) {
    const preferred = provider.models.find((m) => m.id === OPENROUTER_DEFAULT_MODEL);
    if (preferred) {
      return preferred.id;
    }
  }
  const first = provider.models[0]?.id;
  if (!first) {
    throw new Error(
      `No models available for provider "${provider.id}". ` +
        (provider.id === OLLAMA_PROVIDER_ID
          ? "Pull one with `ollama pull llama3.2` or pass --main <model>."
          : "Pass --main <model> (OpenRouter uses namespaced ids like openai/gpt-4o-mini)."),
    );
  }
  return first;
}

async function resolveLaunchApiKey(
  provider: ProviderConfig,
  ctx: HarnessContext,
): Promise<{ apiKey?: string; apiKeyEnv?: string }> {
  if (provider.auth.type === "none") {
    return {};
  }

  if (provider.id === OPENROUTER_PROVIDER_ID) {
    const apiKey = await resolveOpenRouterApiKey(ctx);
    if (!apiKey) {
      throw new Error(
        "No OpenRouter API key found. Pass --api-key or set OPENROUTER_API_KEY " +
          "(https://openrouter.ai/keys).",
      );
    }
    return { apiKey, apiKeyEnv: OPENROUTER_API_KEY_ENV };
  }

  // Together preset only — not required for the product or other providers.
  const apiKey = await resolveTogetherApiKey({
    apiKey: ctx.apiKey,
    home: ctx.home,
  });
  if (!apiKey) {
    throw new Error(
      "OpenCode Together preset needs a key. Pass --api-key, set TOGETHER_API_KEY, " +
        "or run `openharness configure`. For local models use the default " +
        "`--provider ollama` (no key); for OpenRouter use `--provider openrouter`.",
    );
  }
  const apiKeyEnv =
    provider.auth.type === "bearer" || provider.auth.type === "header"
      ? provider.auth.apiKeyEnv
      : undefined;
  return { apiKey, ...(apiKeyEnv !== undefined ? { apiKeyEnv } : {}) };
}

/** Result of resolving an OpenCode launch WITHOUT spawning the `opencode` binary. */
export type OpencodeLaunchPlan = {
  provider?: ProviderConfig;
  modelId?: string;
  configJson?: OpencodeConfig;
  env?: NodeJS.ProcessEnv;
  /** Args to forward to the `opencode` binary (product flags removed). */
  args: string[];
  cloudDestination: boolean;
  keyPresent: boolean;
  apiKeyEnv?: string | undefined;
  warnings: string[];
  errors: string[];
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Normalize a requested provider id to a builtin preset id for preview fallback. */
function previewProviderId(ctx: HarnessContext): string {
  const id = (ctx.provider ?? OPENCODE_DEFAULT_PROVIDER_ID).trim().toLowerCase();
  return id === "togetherai" ? TOGETHER_PROVIDER_ID : id;
}

/**
 * Resolve the full OpenCode launch (provider, model, inline config, env) WITHOUT
 * spawning the binary. Used by `dry-run` and shared by {@link Harness.run} so the
 * launch math lives in exactly one place.
 *
 * With `preview: true`, a missing provider key becomes a warning so `dry-run`
 * can still render the intended plan; with `preview: false` (a real launch) the
 * missing key is fatal.
 */
export async function planOpencodeLaunch(
  ctx: HarnessContext,
  options: { preview?: boolean } = {},
): Promise<OpencodeLaunchPlan> {
  const plan: OpencodeLaunchPlan = {
    args: [],
    cloudDestination: false,
    keyPresent: false,
    warnings: [],
    errors: [],
  };

  const peeled = peelProductFlags(ctx.passthrough ?? []);
  const effective: HarnessContext = {
    ...ctx,
    passthrough: peeled.rest,
    ...(peeled.provider !== undefined ? { provider: peeled.provider } : {}),
    ...(peeled.baseUrl !== undefined ? { baseUrl: peeled.baseUrl } : {}),
    ...(peeled.main !== undefined ? { main: peeled.main } : {}),
    ...(peeled.apiKey !== undefined ? { apiKey: peeled.apiKey } : {}),
  };

  let provider: ProviderConfig;
  try {
    provider = await resolveProviderForLaunch(effective);
  } catch (err) {
    if (!options.preview) {
      plan.errors.push(errorMessage(err));
      return plan;
    }
    // In preview mode, fall back to the static preset so `dry-run` can still
    // render the intended plan and surface the missing key/connection as a warning.
    const preset = getBuiltinProvider(previewProviderId(effective));
    if (!preset) {
      plan.errors.push(errorMessage(err));
      return plan;
    }
    provider = preset;
    plan.warnings.push(errorMessage(err));
  }
  plan.provider = provider;

  let modelId: string;
  try {
    modelId = defaultModelForProvider(provider, effective.main);
  } catch (err) {
    const requested = effective.main?.trim();
    modelId = requested ?? provider.models[0]?.id ?? "default";
    plan.warnings.push(errorMessage(err));
  }
  plan.modelId = modelId;

  let apiKey: string | undefined;
  let apiKeyEnv: string | undefined;
  try {
    const resolved = await resolveLaunchApiKey(provider, effective);
    apiKey = resolved.apiKey;
    apiKeyEnv = resolved.apiKeyEnv;
  } catch (err) {
    if (options.preview) {
      plan.warnings.push(errorMessage(err));
    } else {
      plan.errors.push(errorMessage(err));
      return plan;
    }
  }
  plan.keyPresent = provider.auth.type === "none" || apiKey !== undefined;
  plan.apiKeyEnv = apiKeyEnv;

  plan.configJson = buildOpencodeConfigJson({ modelId, provider });
  plan.env = buildOpencodeEnv({
    configJson: plan.configJson,
    ...(apiKey !== undefined ? { apiKey } : {}),
    ...(apiKeyEnv !== undefined ? { apiKeyEnv } : {}),
  });
  plan.cloudDestination = provider.id === OPENROUTER_PROVIDER_ID;
  plan.args = opencodeArgsWithoutModelOverrides(peeled.rest);
  return plan;
}

export default defineHarness({
  id: HARNESS.OPENCODE,
  label: "OpenCode",

  async run(ctx: HarnessContext): Promise<HarnessResult> {
    const plan = await planOpencodeLaunch(ctx, { preview: false });
    if (plan.errors.length > 0) {
      throw new Error(plan.errors.join(" "));
    }
    const { provider, modelId, configJson, env, cloudDestination, args } = plan;
    if (!provider || !modelId || !configJson || !env) {
      throw new Error("Internal error: incomplete OpenCode launch plan.");
    }

    // Session-only guarantee: we never write OpenCode's user config paths.
    if (!isSessionOnlyOpencodeLaunch(env)) {
      throw new Error("Internal error: OpenCode launch missing OPENCODE_CONFIG_CONTENT.");
    }

    if (cloudDestination) {
      process.stderr.write(
        `openharness ▸ Cloud destination: OpenRouter (${provider.baseURL}). ` +
          `Prompts leave this machine.\n`,
      );
    }

    process.stderr.write(
      `openharness ▸ Routing OpenCode → ${provider.label}` +
        ` (${modelId}) via session-only config.\n`,
    );

    if (process.env.OPENHARNESS_DEBUG === "1") {
      process.stderr.write(
        `[openharness opencode] provider: ${provider.id} (${opencodeProviderIdFor(provider)})\n`,
      );
      process.stderr.write(`[openharness opencode] baseURL: ${provider.baseURL}\n`);
      process.stderr.write(`[openharness opencode] model: ${modelId}\n`);
      process.stderr.write(`[openharness opencode] config: ${JSON.stringify(configJson)}\n`);
    }

    const child = spawn("opencode", args, {
      env,
      stdio: "inherit",
    });

    const result = await new Promise<{ status: number | null; signal: NodeJS.Signals | null }>(
      (resolve, reject) => {
        child.on("error", reject);
        child.on("exit", (status, signal) => resolve({ status, signal }));
      },
    );

    if (typeof result.status === "number") {
      process.exitCode = result.status;
    }
    return {};
  },
});
