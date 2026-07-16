export type {
  ModelDiscoveryConfig,
  ProviderAuth,
  ProviderCompatibilityPolicy,
  ProviderConfig,
  ProviderEndpointConfig,
  ProviderModel,
  ProviderProtocol,
  ProviderRuntime,
  UpstreamClientOptions,
} from "./types.js";

export {
  defaultCompatibilityPolicy,
  getCompatibilityPolicy,
  OLLAMA_COMPATIBILITY_POLICY,
  TOGETHER_COMPATIBILITY_POLICY,
} from "./policy.js";

export {
  modelDefinitionToProviderModel,
  TOGETHER_API_KEY_ENV,
  TOGETHER_PROVIDER_CONFIG,
  TOGETHER_PROVIDER_ID,
  togetherEndpointConfig,
  togetherProviderModels,
  togetherProviderRuntime,
  togetherVisionProviderModels,
} from "./together-preset.js";

export {
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_PROVIDER_CONFIG,
  OLLAMA_PROVIDER_ID,
  buildOllamaProviderConfig,
  normalizeOllamaModelId,
  ollamaEndpointConfig,
  ollamaModelFromId,
} from "./ollama-preset.js";

export { discoverOllamaModels, type OllamaDiscoveryResult } from "./ollama-discovery.js";

export {
  getBuiltinProvider,
  isBuiltinProviderId,
  listBuiltinProviderIds,
  type BuiltinProviderId,
} from "./registry.js";

export {
  buildAuthHeaders,
  resolveProviderRuntime,
  toEndpointConfig,
  toUpstreamClientOptions,
  upstreamOptionsFromProxy,
} from "./runtime.js";
