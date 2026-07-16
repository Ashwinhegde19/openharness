import { OLLAMA_COMPATIBILITY_POLICY } from "./policy.js";
import type { ProviderConfig, ProviderEndpointConfig, ProviderModel } from "./types.js";

export const OLLAMA_PROVIDER_ID = "ollama";

/** Default OpenAI-compatible base URL for a local Ollama daemon. */
export const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1";

/**
 * Built-in Ollama provider preset (M3).
 *
 * - No cloud key (`auth.type: "none"`).
 * - OpenAI-compatible chat at `/v1`.
 * - Static model list starts empty; discovery fills models at launch time.
 */
export function buildOllamaProviderConfig(options?: {
  baseURL?: string | undefined;
  models?: ProviderModel[] | undefined;
}): ProviderConfig {
  return {
    id: OLLAMA_PROVIDER_ID,
    label: "Ollama",
    baseURL: (options?.baseURL ?? OLLAMA_DEFAULT_BASE_URL).replace(/\/+$/, ""),
    protocol: "openai-chat",
    auth: { type: "none" },
    models: options?.models ?? [],
    modelDiscovery: {
      path: "/models",
      allowStaticFallback: true,
    },
    compatibilityPolicyId: OLLAMA_COMPATIBILITY_POLICY.id,
  };
}

/** Static preset with empty model catalog (discovery populates at launch). */
export const OLLAMA_PROVIDER_CONFIG: ProviderConfig = buildOllamaProviderConfig();

export function ollamaEndpointConfig(baseURL?: string): ProviderEndpointConfig {
  const config = buildOllamaProviderConfig(baseURL !== undefined ? { baseURL } : undefined);
  return {
    id: config.id,
    label: config.label,
    baseURL: config.baseURL,
    protocol: config.protocol,
    auth: config.auth,
    ...(config.compatibilityPolicyId
      ? { compatibilityPolicyId: config.compatibilityPolicyId }
      : {}),
  };
}

/**
 * Normalize an Ollama model id for OpenCode (`name` tag without registry path).
 * Ollama returns ids like `llama3.2:latest` or `qwen2.5-coder:7b`.
 */
export function normalizeOllamaModelId(id: string): string {
  return id.trim();
}

export function ollamaModelFromId(id: string, label?: string): ProviderModel {
  const normalized = normalizeOllamaModelId(id);
  return {
    id: normalized,
    label: label ?? normalized,
    capabilities: {
      text: true,
      streaming: true,
      // Tool support depends on the pulled model; assume true for coding models
      // and let the harness surface provider errors if tools fail.
      tools: true,
      temperature: true,
    },
    verification: { state: "inferred" },
  };
}
