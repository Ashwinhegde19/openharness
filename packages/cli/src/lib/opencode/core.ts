import { TOGETHER_API_KEY_ENV_REF } from "../together-core.js";
import {
  OLLAMA_PROVIDER_ID,
  OPENROUTER_PROVIDER_ID,
  TOGETHER_PROVIDER_CONFIG,
  TOGETHER_PROVIDER_ID,
  type ProviderConfig,
  type ProviderModel,
} from "../provider/index.js";
import {
  OPENCODE_PROVIDER_ID,
  OPENCODE_DEFAULT_MODEL,
  OPENCODE_MODEL_ENTRIES,
  OPENCODE_VISION_MODEL_SELECTOR,
  OPENCODE_BUILD_PROMPT,
  OPENCODE_VISION_AGENT_PROMPT,
} from "./defaults.js";

export type OpencodeConfig = {
  $schema?: string;
  model?: string;
  provider?: Record<string, Record<string, unknown>>;
  agent?: Record<string, Record<string, unknown>>;
  /**
   * Provider ids OpenCode won't auto-load. We disable "opencode" — the Zen
   * gateway provider (its models are registered under the `opencode/*`
   * namespace, not `zen/*`, per opencode issue #6979).
   */
  disabled_providers?: string[];
  /**
   * The ONLY providers OpenCode loads; every other provider is ignored so
   * /models stays to our curated or discovered set for this session.
   */
  enabled_providers?: string[];
};

type OpencodeProviderConfig = {
  npm: string;
  name: string;
  options: {
    apiKey?: string;
    baseURL?: string;
    /** Extra request headers (e.g. OpenRouter HTTP-Referer / X-Title). */
    headers?: Record<string, string>;
  };
  models?: Record<string, unknown>;
  /**
   * Restricts the provider so ONLY these model ids appear in /models
   * (otherwise OpenCode merges our declared models on top of models.dev).
   */
  whitelist?: string[];
};

type OpencodeModelEntry = {
  name: string;
  attachment: boolean;
  reasoning: boolean;
  temperature: boolean;
  tool_call: boolean;
  limit?: { context: number; output: number };
  modalities?: { input: string[]; output: string[] };
  cost?: { input: number; output: number; cache_read: number };
};

/** Env-ref string for a provider auth scheme (`{env:NAME}`), or undefined when none. */
function apiKeyEnvRefFromProvider(provider: ProviderConfig): string | undefined {
  if (provider.auth.type === "bearer" || provider.auth.type === "header") {
    return `{env:${provider.auth.apiKeyEnv}}`;
  }
  return undefined;
}

/** OpenCode-facing provider id for a product ProviderConfig. */
export function opencodeProviderIdFor(provider: ProviderConfig): string {
  if (provider.id === TOGETHER_PROVIDER_ID) {
    return OPENCODE_PROVIDER_ID; // togetherai
  }
  if (provider.id === OLLAMA_PROVIDER_ID) {
    return OLLAMA_PROVIDER_ID;
  }
  if (provider.id === OPENROUTER_PROVIDER_ID) {
    return OPENROUTER_PROVIDER_ID;
  }
  return provider.id;
}

/** npm package OpenCode should load for this provider. */
export function opencodeNpmFor(provider: ProviderConfig): string {
  if (provider.id === TOGETHER_PROVIDER_ID) {
    return "@ai-sdk/togetherai";
  }
  // Ollama, OpenRouter, and other OpenAI-compatible presets.
  return "@ai-sdk/openai-compatible";
}

function providerModelToOpencodeEntry(model: ProviderModel): OpencodeModelEntry {
  const vision = model.capabilities?.vision === true;
  return {
    name: model.label,
    attachment: vision,
    reasoning: model.capabilities?.reasoning === true,
    temperature: model.capabilities?.temperature !== false,
    tool_call: model.capabilities?.tools === true,
    ...(model.limits?.contextTokens !== undefined || model.limits?.outputTokens !== undefined
      ? {
          limit: {
            context: model.limits?.contextTokens ?? 128_000,
            output: model.limits?.outputTokens ?? 32_768,
          },
        }
      : {}),
    modalities: {
      input: vision ? ["text", "image"] : ["text"],
      output: ["text"],
    },
    ...(model.pricing
      ? {
          cost: {
            input: model.pricing.inputPerMillion ?? 0,
            output: model.pricing.outputPerMillion ?? 0,
            cache_read: model.pricing.cachedInputPerMillion ?? 0,
          },
        }
      : {}),
  };
}

function modelEntriesForProvider(provider: ProviderConfig): Record<string, OpencodeModelEntry> {
  if (provider.id === TOGETHER_PROVIDER_ID) {
    // Preserve tip-bearing curated Together entries (pre-M1 display names).
    return { ...OPENCODE_MODEL_ENTRIES };
  }
  return Object.fromEntries(
    provider.models.map((model) => [model.id, providerModelToOpencodeEntry(model)]),
  );
}

/**
 * Builds the inline OpenCode config passed via `OPENCODE_CONFIG_CONTENT`.
 *
 * Provider block is driven by {@link ProviderConfig}. Together keeps the
 * first-party `@ai-sdk/togetherai` adapter; Ollama and other compatible
 * presets use `@ai-sdk/openai-compatible` with an explicit baseURL.
 *
 * Highest precedence for settings, with no OpenCode config files written.
 */
export function buildOpencodeConfigJson({
  modelId = OPENCODE_DEFAULT_MODEL,
  provider = TOGETHER_PROVIDER_CONFIG,
  apiKeyEnvRef,
  buildPrompt = OPENCODE_BUILD_PROMPT,
  visionPrompt = OPENCODE_VISION_AGENT_PROMPT,
  opencodeProviderId,
  opencodeNpm,
  includeVisionSubagent,
}: {
  modelId?: string;
  provider?: ProviderConfig;
  apiKeyEnvRef?: string;
  buildPrompt?: string;
  visionPrompt?: string;
  /** OpenCode-facing provider id override. */
  opencodeProviderId?: string;
  /** OpenCode npm package for the provider adapter. */
  opencodeNpm?: string;
  /** When false, omit the @vision subagent (e.g. local Ollama with no vision model). */
  includeVisionSubagent?: boolean;
} = {}): OpencodeConfig {
  const providerId = opencodeProviderId ?? opencodeProviderIdFor(provider);
  const npm = opencodeNpm ?? opencodeNpmFor(provider);
  const resolvedKeyRef =
    apiKeyEnvRef !== undefined ? apiKeyEnvRef : apiKeyEnvRefFromProvider(provider);
  const models = modelEntriesForProvider(provider);
  const whitelist = Object.keys(models);

  if (whitelist.length === 0) {
    throw new Error(
      `Provider "${provider.id}" has no models to expose to OpenCode. ` +
        (provider.id === OLLAMA_PROVIDER_ID
          ? "Pull a model with `ollama pull <name>` or pass --main <model>."
          : "Check the provider catalog."),
    );
  }

  if (!whitelist.includes(modelId)) {
    throw new Error(
      `Model "${modelId}" is not available on provider "${provider.id}". ` +
        `Available: ${whitelist.slice(0, 12).join(", ")}${whitelist.length > 12 ? ", …" : ""}.`,
    );
  }

  const options: OpencodeProviderConfig["options"] = {};
  if (resolvedKeyRef !== undefined) {
    options.apiKey = resolvedKeyRef;
  }
  // Together's first-party adapter knows its URL; openai-compatible needs baseURL.
  if (provider.id !== TOGETHER_PROVIDER_ID) {
    options.baseURL = provider.baseURL;
  }
  if (provider.headers && Object.keys(provider.headers).length > 0) {
    options.headers = { ...provider.headers };
  }

  const providerBlock: OpencodeProviderConfig = {
    npm,
    name: provider.label,
    options,
    models,
    whitelist,
  };

  const useVision =
    includeVisionSubagent ??
    (provider.id === TOGETHER_PROVIDER_ID && Boolean(OPENCODE_VISION_MODEL_SELECTOR));

  const agent: Record<string, Record<string, unknown>> = {
    build: {
      prompt: buildPrompt,
    },
  };
  if (useVision) {
    agent.vision = {
      mode: "subagent",
      description:
        "Describes images the user attaches, for use by a text-only primary model. Because of an OpenCode bug (#25553) the image is not always forwarded to this subagent, so the primary agent does not auto-invoke it. You can still invoke it explicitly with @vision; if it reports it can't see the image, switch to a vision-capable model via /models instead.",
      model: OPENCODE_VISION_MODEL_SELECTOR,
      prompt: visionPrompt,
    };
  }

  return {
    $schema: "https://opencode.ai/config.json",
    provider: {
      [providerId]: providerBlock,
    },
    model: `${providerId}/${modelId}`,
    enabled_providers: [providerId],
    disabled_providers: ["opencode"],
    agent,
  };
}

/**
 * Env for the spawned `opencode` process: inline settings config (highest
 * precedence, never persisted) plus optional resolved provider key so
 * `{env:…}` substitution resolves inside the config.
 */
export function buildOpencodeEnv({
  apiKey,
  configJson,
  apiKeyEnv = "TOGETHER_API_KEY",
}: {
  apiKey?: string;
  configJson: OpencodeConfig;
  /** Env var name that holds the resolved key for OpenCode `{env:…}` refs. */
  apiKeyEnv?: string;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(configJson),
  };
  if (apiKey !== undefined && apiKey !== "") {
    env[apiKeyEnv] = apiKey;
  }
  return env;
}

/** True when the config is session-only (env injection) with no path writes. */
export function isSessionOnlyOpencodeLaunch(env: NodeJS.ProcessEnv): boolean {
  return typeof env.OPENCODE_CONFIG_CONTENT === "string" && env.OPENCODE_CONFIG_CONTENT.length > 0;
}
