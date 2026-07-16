import {
  SELECTABLE_MODELS,
  TOGETHER_BASE_URL,
  VISION_MODELS,
  type ModelDefinition,
} from "@togetherlink/models";
import { TOGETHER_COMPATIBILITY_POLICY } from "./policy.js";
import type {
  ProviderConfig,
  ProviderEndpointConfig,
  ProviderModel,
  ProviderRuntime,
} from "./types.js";

export const TOGETHER_PROVIDER_ID = "together";
export const TOGETHER_API_KEY_ENV = "TOGETHER_API_KEY";

/**
 * Map a catalog {@link ModelDefinition} into the provider-neutral model shape.
 * Catalog data stays the source of truth in `@togetherlink/models`; this is the
 * view the generic runtime consumes.
 */
export function modelDefinitionToProviderModel(def: ModelDefinition): ProviderModel {
  const vision = def.attachment && def.modalities.input.includes("image");
  return {
    id: def.id,
    label: def.name,
    ...(def.anthropicAlias ? { aliases: [def.anthropicAlias] } : {}),
    limits: {
      contextTokens: def.limit.context,
      outputTokens: def.limit.output,
    },
    capabilities: {
      text: true,
      streaming: true,
      tools: def.tool_call,
      vision,
      reasoning: def.reasoning,
      temperature: def.temperature,
    },
    pricing: {
      currency: "USD",
      inputPerMillion: def.cost.input,
      outputPerMillion: def.cost.output,
      cachedInputPerMillion: def.cost.cache_read,
      source: "together-catalog",
    },
    verification: { state: "recommended" },
  };
}

/**
 * User-selectable Together catalog as ProviderModel[] (OpenCode /models order).
 * Vision-only fallback models that are not selectable primaries are excluded
 * so OpenCode whitelist behavior matches pre-M1 OPENCODE_MODEL_WHITELIST.
 */
export function togetherProviderModels(): ProviderModel[] {
  return SELECTABLE_MODELS.map(modelDefinitionToProviderModel);
}

/** Vision helper models (may overlap selectable); used by Claude image path. */
export function togetherVisionProviderModels(): ProviderModel[] {
  return VISION_MODELS.map(modelDefinitionToProviderModel);
}

/**
 * Built-in Together AI provider preset. Runtime defaults to this until other
 * presets (Ollama, OpenRouter) land. Models are data; the core should not
 * hard-code Together beyond selecting this preset.
 */
export const TOGETHER_PROVIDER_CONFIG: ProviderConfig = {
  id: TOGETHER_PROVIDER_ID,
  label: "Together AI",
  baseURL: TOGETHER_BASE_URL,
  protocol: "openai-chat",
  auth: {
    type: "bearer",
    apiKeyEnv: TOGETHER_API_KEY_ENV,
    required: true,
  },
  models: togetherProviderModels(),
  compatibilityPolicyId: TOGETHER_COMPATIBILITY_POLICY.id,
};

/** Non-secret endpoint slice for session registration / persistence. */
export function togetherEndpointConfig(): ProviderEndpointConfig {
  const { id, label, baseURL, protocol, auth, headers, queryParams, compatibilityPolicyId } =
    TOGETHER_PROVIDER_CONFIG;
  return {
    id,
    label,
    baseURL,
    protocol,
    auth,
    ...(headers ? { headers } : {}),
    ...(queryParams ? { queryParams } : {}),
    ...(compatibilityPolicyId ? { compatibilityPolicyId } : {}),
  };
}

/** In-memory Together runtime for a resolved API key. */
export function togetherProviderRuntime(apiKey: string): ProviderRuntime {
  return {
    ...togetherEndpointConfig(),
    apiKey,
  };
}
