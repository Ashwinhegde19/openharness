import { OPENROUTER_COMPATIBILITY_POLICY } from "./policy.js";
import type { ProviderConfig, ProviderEndpointConfig, ProviderModel } from "./types.js";

export const OPENROUTER_PROVIDER_ID = "openrouter";
export const OPENROUTER_API_KEY_ENV = "OPENROUTER_API_KEY";
export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

/** Default coding-friendly model when the user does not pass --main. */
export const OPENROUTER_DEFAULT_MODEL = "openai/gpt-4o-mini";

/**
 * Curated OpenRouter model ids for OpenCode /models (namespaced `org/model`).
 * Discovery can enlarge the set; this list is the static fallback when the
 * network catalog is unavailable.
 */
export const OPENROUTER_CURATED_MODELS: readonly ProviderModel[] = [
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini · cheap · tools",
    capabilities: {
      text: true,
      streaming: true,
      tools: true,
      vision: true,
      temperature: true,
    },
    limits: { contextTokens: 128_000, outputTokens: 16_384 },
    verification: { state: "inferred" },
  },
  {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4 · coding",
    capabilities: {
      text: true,
      streaming: true,
      tools: true,
      vision: true,
      temperature: true,
    },
    limits: { contextTokens: 200_000, outputTokens: 64_000 },
    verification: { state: "inferred" },
  },
  {
    id: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    capabilities: {
      text: true,
      streaming: true,
      tools: true,
      vision: true,
      temperature: true,
    },
    limits: { contextTokens: 1_000_000, outputTokens: 8_192 },
    verification: { state: "inferred" },
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    capabilities: {
      text: true,
      streaming: true,
      tools: true,
      temperature: true,
    },
    limits: { contextTokens: 131_072, outputTokens: 16_384 },
    verification: { state: "inferred" },
  },
];

/** App attribution headers recommended by OpenRouter. */
export const OPENROUTER_DEFAULT_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://github.com/Ashwinhegde19/openharness",
  "X-Title": "openharness",
};

export function openrouterModelFromId(id: string, label?: string): ProviderModel {
  const normalized = id.trim();
  const curated = OPENROUTER_CURATED_MODELS.find((m) => m.id === normalized);
  if (curated) {
    return label ? { ...curated, label } : { ...curated };
  }
  return {
    id: normalized,
    label: label ?? normalized,
    capabilities: {
      text: true,
      streaming: true,
      tools: true,
      temperature: true,
    },
    verification: { state: "untested" },
  };
}

/**
 * Built-in OpenRouter provider preset (M4).
 *
 * - Bearer auth via `OPENROUTER_API_KEY`
 * - OpenAI-compatible chat at `https://openrouter.ai/api/v1`
 * - Namespaced model ids (`provider/model`)
 * - Optional attribution headers (Referer / X-Title)
 */
export function buildOpenRouterProviderConfig(options?: {
  baseURL?: string | undefined;
  models?: ProviderModel[] | undefined;
  headers?: Record<string, string> | undefined;
}): ProviderConfig {
  return {
    id: OPENROUTER_PROVIDER_ID,
    label: "OpenRouter",
    baseURL: (options?.baseURL ?? OPENROUTER_DEFAULT_BASE_URL).replace(/\/+$/, ""),
    protocol: "openai-chat",
    auth: {
      type: "bearer",
      apiKeyEnv: OPENROUTER_API_KEY_ENV,
      required: true,
    },
    headers: options?.headers ?? { ...OPENROUTER_DEFAULT_HEADERS },
    secretHeaderNames: [],
    models: options?.models ? [...options.models] : [...OPENROUTER_CURATED_MODELS],
    modelDiscovery: {
      path: "/models",
      allowStaticFallback: true,
    },
    compatibilityPolicyId: OPENROUTER_COMPATIBILITY_POLICY.id,
  };
}

export const OPENROUTER_PROVIDER_CONFIG: ProviderConfig = buildOpenRouterProviderConfig();

export function openrouterEndpointConfig(baseURL?: string): ProviderEndpointConfig {
  const config = buildOpenRouterProviderConfig(baseURL !== undefined ? { baseURL } : undefined);
  return {
    id: config.id,
    label: config.label,
    baseURL: config.baseURL,
    protocol: config.protocol,
    auth: config.auth,
    ...(config.headers ? { headers: config.headers } : {}),
    ...(config.compatibilityPolicyId
      ? { compatibilityPolicyId: config.compatibilityPolicyId }
      : {}),
  };
}
