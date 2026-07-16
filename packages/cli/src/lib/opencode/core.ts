import { TOGETHER_API_KEY_ENV_REF } from "../together-core.js";
import {
  TOGETHER_PROVIDER_CONFIG,
  type ProviderConfig,
} from "../provider/index.js";
import {
  OPENCODE_PROVIDER_ID,
  OPENCODE_DEFAULT_MODEL,
  OPENCODE_MODEL_ENTRIES,
  OPENCODE_VISION_MODEL_SELECTOR,
  OPENCODE_BUILD_PROMPT,
  OPENCODE_VISION_AGENT_PROMPT,
} from "./defaults.js";

type OpencodeConfig = {
  $schema?: string;
  model?: string;
  provider?: Record<string, Record<string, unknown>>;
  agent?: Record<string, Record<string, unknown>>;
  /**
   * Provider ids OpenCode won't auto-load. We disable "opencode" — the Zen
   * gateway provider (its models are registered under the `opencode/*`
   * namespace, not `zen/*`, per opencode issue #6979). togetherlink routes
   * everything to Together, so Zen's auto-loaded models are pure clutter in
   * the picker; this keeps /models to only the Together flagships we curate.
   * (disabled_providers takes priority over enabled_providers, per the docs.)
   */
  disabled_providers?: string[];
  /**
   * The ONLY providers OpenCode loads; every other provider (Anthropic, OpenAI,
   * Gemini, Bedrock, Zen…) is ignored entirely. This is the strongest lockdown:
   * it can't hide the built-in "Connect provider" (ctrl+a) picker button — there
   * is no config field for that — but it means only `togetherai` is active, so
   * /models stays to our curated set and there's nothing else to switch to.
   */
  enabled_providers?: string[];
};

type OpencodeProviderConfig = {
  npm: string;
  name: string;
  options: { apiKey: string; baseURL?: string };
  models?: Record<string, unknown>;
  /**
   * Restricts the provider so ONLY these model ids appear in /models
   * (otherwise OpenCode merges our declared models on top of Together's full
   * models.dev catalog, surfacing hundreds of unrelated models). Added in
   * opencode PR #3416: "Whitelist restricts to only specified models
   * (empty whitelist = no models); blacklist is treated over whitelist."
   */
  whitelist?: string[];
};

/** Env-ref string for a provider auth scheme (`{env:NAME}`). */
function apiKeyEnvRefFromProvider(provider: ProviderConfig): string {
  if (provider.auth.type === "bearer" || provider.auth.type === "header") {
    return `{env:${provider.auth.apiKeyEnv}}`;
  }
  return TOGETHER_API_KEY_ENV_REF;
}

/**
 * Builds the inline OpenCode config passed via `OPENCODE_CONFIG_CONTENT`.
 *
 * Provider block is driven by {@link ProviderConfig} (Together preset by
 * default). For the Together preset we keep the first-party
 * `@ai-sdk/togetherai` adapter (it already knows Together's base URL). Model
 * entry metadata still comes from the curated OpenCode catalog so display tips
 * and modalities stay identical to pre-M1 behavior; the whitelist is the
 * provider's model id list.
 *
 * Highest precedence for settings, with no OpenCode config files written.
 */
export function buildOpencodeConfigJson({
  modelId = OPENCODE_DEFAULT_MODEL,
  provider = TOGETHER_PROVIDER_CONFIG,
  apiKeyEnvRef,
  buildPrompt = OPENCODE_BUILD_PROMPT,
  visionPrompt = OPENCODE_VISION_AGENT_PROMPT,
  opencodeProviderId = OPENCODE_PROVIDER_ID,
  opencodeNpm = "@ai-sdk/togetherai",
}: {
  modelId?: string;
  provider?: ProviderConfig;
  apiKeyEnvRef?: string;
  buildPrompt?: string;
  visionPrompt?: string;
  /** OpenCode-facing provider id (Together uses `togetherai`). */
  opencodeProviderId?: string;
  /** OpenCode npm package for the provider adapter. */
  opencodeNpm?: string;
} = {}): OpencodeConfig {
  const resolvedKeyRef = apiKeyEnvRef ?? apiKeyEnvRefFromProvider(provider);
  // Register every curated flagship (the full set /models shows) with their
  // real metadata + tip-bearing display names. The `@vision` subagent's model
  // (Kimi-K2.7-Code) is part of this set, so it's covered too.
  const models = { ...OPENCODE_MODEL_ENTRIES };
  const whitelist = provider.models.map((model) => model.id);

  const providerBlock: OpencodeProviderConfig = {
    npm: opencodeNpm,
    // Provider label: OpenCode appends this provider `name` to every model
    // line in the /models picker (e.g. "GLM 5.2 · default  Together AI").
    name: provider.label,
    options: { apiKey: resolvedKeyRef },
    models,
    // Restrict /models to exactly the curated set from the provider preset.
    whitelist,
  };

  return {
    $schema: "https://opencode.ai/config.json",
    provider: {
      [opencodeProviderId]: providerBlock,
    },
    // Slash form: provider/model. The selected model is the primary; sub-agents
    // without an explicit model inherit it automatically. The `vision` subagent
    // explicitly pins a vision-capable Together model (Kimi-K2.7-Code) so a
    // text-only primary can still describe pasted images. To add more
    // sub-agents later, add entries under `agent`.
    model: `${opencodeProviderId}/${modelId}`,
    // Only load our configured provider; ignore every other provider so /models
    // stays to the curated set.
    enabled_providers: [opencodeProviderId],
    // Belt-and-suspenders: also explicitly disable the Zen gateway (provider id
    // "opencode", the `opencode/*` namespace) — issue #6979 confirms the id is
    // "opencode", not "zen". disabled_providers takes priority over
    // enabled_providers, so this stays effective even if the precedence changes.
    disabled_providers: ["opencode"],
    agent: {
      build: {
        prompt: buildPrompt,
      },
      // Describes images the primary model can't see. NOTE: due to opencode
      // issue #25553, images attached via clipboard/@mention aren't forwarded to
      // subagents, so the build prompt tells text-only primaries NOT to auto-
      // invoke this (it only errors). The subagent stays available for explicit
      // @vision use and may work for file-attached images once #25553 is fixed.
      vision: {
        mode: "subagent",
        description:
          "Describes images the user attaches, for use by a text-only primary model. Because of an OpenCode bug (#25553) the image is not always forwarded to this subagent, so the primary agent does not auto-invoke it. You can still invoke it explicitly with @vision; if it reports it can't see the image, switch to a vision-capable model via /models instead.",
        model: OPENCODE_VISION_MODEL_SELECTOR,
        prompt: visionPrompt,
      },
    },
  };
}

/**
 * Env for the spawned `opencode` process: inline settings config (highest
 * precedence, never persisted) plus the resolved provider key so
 * `{env:…}` substitution resolves inside the config.
 */
export function buildOpencodeEnv({
  apiKey,
  configJson,
  apiKeyEnv = "TOGETHER_API_KEY",
}: {
  apiKey: string;
  configJson: OpencodeConfig;
  /** Env var name that holds the resolved key for OpenCode `{env:…}` refs. */
  apiKeyEnv?: string;
}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(configJson),
    [apiKeyEnv]: apiKey,
  };
}
