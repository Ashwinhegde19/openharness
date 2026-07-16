import { TOGETHER_PROVIDER_CONFIG, TOGETHER_PROVIDER_ID } from "./together-preset.js";
import {
  OLLAMA_PROVIDER_CONFIG,
  OLLAMA_PROVIDER_ID,
  buildOllamaProviderConfig,
} from "./ollama-preset.js";
import type { ProviderConfig } from "./types.js";

export type BuiltinProviderId = typeof TOGETHER_PROVIDER_ID | typeof OLLAMA_PROVIDER_ID;

const BUILTIN: Record<string, ProviderConfig> = {
  [TOGETHER_PROVIDER_ID]: TOGETHER_PROVIDER_CONFIG,
  [OLLAMA_PROVIDER_ID]: OLLAMA_PROVIDER_CONFIG,
};

/** Known built-in provider preset ids. */
export function listBuiltinProviderIds(): BuiltinProviderId[] {
  return [TOGETHER_PROVIDER_ID, OLLAMA_PROVIDER_ID];
}

/**
 * Resolve a built-in provider preset by id. Optional baseURL override applies
 * to Ollama (and future local/compatible presets).
 */
export function getBuiltinProvider(
  id: string,
  options?: { baseURL?: string | undefined },
): ProviderConfig | undefined {
  const normalized = id.trim().toLowerCase();
  if (normalized === OLLAMA_PROVIDER_ID) {
    return buildOllamaProviderConfig(
      options?.baseURL !== undefined ? { baseURL: options.baseURL } : undefined,
    );
  }
  if (normalized === TOGETHER_PROVIDER_ID || normalized === "togetherai") {
    return TOGETHER_PROVIDER_CONFIG;
  }
  return BUILTIN[normalized];
}

/** Whether `id` names a built-in preset we ship. */
export function isBuiltinProviderId(id: string): id is BuiltinProviderId {
  const normalized = id.trim().toLowerCase();
  return normalized === TOGETHER_PROVIDER_ID || normalized === "togetherai" || normalized === OLLAMA_PROVIDER_ID;
}
