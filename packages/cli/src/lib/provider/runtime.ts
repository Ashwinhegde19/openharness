import { togetherEndpointConfig } from "./together-preset.js";
import type {
  ProviderAuth,
  ProviderEndpointConfig,
  ProviderRuntime,
  UpstreamClientOptions,
} from "./types.js";

/**
 * Build a session runtime from an optional registration endpoint + resolved key.
 * Missing/partial endpoint falls back to the Together preset (M1: Together only).
 */
export function resolveProviderRuntime(
  endpoint: ProviderEndpointConfig | undefined,
  apiKey: string,
): ProviderRuntime {
  const base = endpoint ?? togetherEndpointConfig();
  return {
    id: base.id,
    label: base.label,
    baseURL: base.baseURL,
    protocol: base.protocol,
    auth: base.auth,
    apiKey,
    ...(base.headers ? { headers: base.headers } : {}),
    ...(base.queryParams ? { queryParams: base.queryParams } : {}),
    ...(base.compatibilityPolicyId ? { compatibilityPolicyId: base.compatibilityPolicyId } : {}),
  };
}

/** Strip the secret for serialization onto RegisterSessionRequest. */
export function toEndpointConfig(runtime: ProviderRuntime): ProviderEndpointConfig {
  return {
    id: runtime.id,
    label: runtime.label,
    baseURL: runtime.baseURL,
    protocol: runtime.protocol,
    auth: runtime.auth,
    ...(runtime.headers ? { headers: runtime.headers } : {}),
    ...(runtime.queryParams ? { queryParams: runtime.queryParams } : {}),
    ...(runtime.compatibilityPolicyId
      ? { compatibilityPolicyId: runtime.compatibilityPolicyId }
      : {}),
  };
}

/**
 * Options for the shared upstream HTTP client (formerly hard-coded Together).
 */
export function toUpstreamClientOptions(
  runtime: ProviderRuntime,
  debug?: boolean,
): UpstreamClientOptions {
  return {
    apiKey: runtime.apiKey,
    baseURL: runtime.baseURL,
    auth: runtime.auth,
    ...(runtime.headers ? { headers: runtime.headers } : {}),
    ...(runtime.queryParams ? { queryParams: runtime.queryParams } : {}),
    ...(debug !== undefined ? { debug } : {}),
  };
}

/** Build Authorization (or custom auth) headers for a provider auth scheme. */
export function buildAuthHeaders(auth: ProviderAuth, apiKey: string): Record<string, string> {
  if (auth.type === "bearer" && apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }
  if (auth.type === "header" && apiKey) {
    return { [auth.headerName]: apiKey };
  }
  return {};
}

/**
 * Resolve UpstreamClientOptions from proxy option bags that still carry a bare
 * `apiKey` (backward compatible) plus optional provider fields.
 */
export function upstreamOptionsFromProxy(options: {
  apiKey: string;
  baseURL?: string | undefined;
  auth?: ProviderAuth | undefined;
  headers?: Record<string, string> | undefined;
  queryParams?: Record<string, string> | undefined;
  debug?: boolean | undefined;
}): UpstreamClientOptions {
  return {
    apiKey: options.apiKey,
    ...(options.baseURL !== undefined ? { baseURL: options.baseURL } : {}),
    ...(options.auth !== undefined ? { auth: options.auth } : {}),
    ...(options.headers !== undefined ? { headers: options.headers } : {}),
    ...(options.queryParams !== undefined ? { queryParams: options.queryParams } : {}),
    ...(options.debug !== undefined ? { debug: options.debug } : {}),
  };
}
