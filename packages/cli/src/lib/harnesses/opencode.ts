import { spawn } from "node:child_process";
import { OPENCODE_DEFAULT_MODEL } from "../opencode/defaults.js";
import {
  buildOpencodeConfigJson,
  buildOpencodeEnv,
  isSessionOnlyOpencodeLaunch,
  opencodeProviderIdFor,
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
 * `togetherlink opencode --provider ollama`). Peel them into context so they
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

async function resolveProviderForLaunch(ctx: HarnessContext): Promise<ProviderConfig> {
  const providerId = (ctx.provider ?? TOGETHER_PROVIDER_ID).trim().toLowerCase();
  if (!isBuiltinProviderId(providerId) && providerId !== "togetherai") {
    throw new Error(`Unknown provider "${ctx.provider}". Supported: together, ollama, openrouter.`);
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
        `togetherlink ▸ Warning: ${discovery.error} Using --main ${requested} without discovery.\n`,
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
      `togetherlink ▸ Model "${requested}" was not in Ollama's catalog; ` +
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
      `togetherlink ▸ Warning: ${discovery.error} Using curated OpenRouter catalog.\n`,
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
  return process.env[OPENROUTER_API_KEY_ENV]?.trim() ?? "";
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

  // Together (default) — global config + TOGETHER_API_KEY.
  const apiKey = await resolveTogetherApiKey({
    apiKey: ctx.apiKey,
    home: ctx.home,
  });
  if (!apiKey) {
    throw new Error(
      "No Together API key found. Pass --api-key or set TOGETHER_API_KEY " +
        "(or use --provider ollama / --provider openrouter).",
    );
  }
  const apiKeyEnv =
    provider.auth.type === "bearer" || provider.auth.type === "header"
      ? provider.auth.apiKeyEnv
      : undefined;
  return { apiKey, ...(apiKeyEnv !== undefined ? { apiKeyEnv } : {}) };
}

export default defineHarness({
  id: HARNESS.OPENCODE,
  label: "OpenCode",

  async run(ctx: HarnessContext): Promise<HarnessResult> {
    const peeled = peelProductFlags(ctx.passthrough ?? []);
    const effective: HarnessContext = {
      ...ctx,
      passthrough: peeled.rest,
      ...(peeled.provider !== undefined ? { provider: peeled.provider } : {}),
      ...(peeled.baseUrl !== undefined ? { baseUrl: peeled.baseUrl } : {}),
      ...(peeled.main !== undefined ? { main: peeled.main } : {}),
      ...(peeled.apiKey !== undefined ? { apiKey: peeled.apiKey } : {}),
    };

    const provider = await resolveProviderForLaunch(effective);
    const modelId = defaultModelForProvider(provider, effective.main);
    const { apiKey, apiKeyEnv } = await resolveLaunchApiKey(provider, effective);

    const configJson = buildOpencodeConfigJson({ modelId, provider });
    const env = buildOpencodeEnv({
      configJson,
      ...(apiKey !== undefined ? { apiKey } : {}),
      ...(apiKeyEnv !== undefined ? { apiKeyEnv } : {}),
    });

    // Session-only guarantee: we never write OpenCode's user config paths.
    if (!isSessionOnlyOpencodeLaunch(env)) {
      throw new Error("Internal error: OpenCode launch missing OPENCODE_CONFIG_CONTENT.");
    }

    if (provider.id === OPENROUTER_PROVIDER_ID) {
      process.stderr.write(
        `togetherlink ▸ Cloud destination: OpenRouter (${provider.baseURL}). ` +
          `Prompts leave this machine.\n`,
      );
    }

    process.stderr.write(
      `togetherlink ▸ Routing OpenCode → ${provider.label}` +
        ` (${modelId}) via session-only config.\n`,
    );

    if (process.env.TOGETHERLINK_DEBUG === "1") {
      process.stderr.write(
        `[togetherlink opencode] provider: ${provider.id} (${opencodeProviderIdFor(provider)})\n`,
      );
      process.stderr.write(`[togetherlink opencode] baseURL: ${provider.baseURL}\n`);
      process.stderr.write(`[togetherlink opencode] model: ${modelId}\n`);
      process.stderr.write(`[togetherlink opencode] config: ${JSON.stringify(configJson)}\n`);
    }

    const child = spawn(
      "opencode",
      opencodeArgsWithoutModelOverrides(effective.passthrough ?? []),
      {
        env,
        stdio: "inherit",
      },
    );

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
