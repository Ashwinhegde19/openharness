/**
 * Provider-neutral configuration types (ARCHITECTURE.md §6).
 *
 * These describe how to reach a model provider. They intentionally do not
 * contain harness-specific env names, launch plans, or resolved secrets in
 * persistent form. Session-scoped secrets live on {@link ProviderRuntime}.
 */

export type ProviderProtocol = "openai-chat" | "openai-responses" | "anthropic-messages" | "gemini";

/**
 * How to build the upstream Authorization (or equivalent) header.
 * Describes the scheme and which env var supplies the key — not the key itself.
 */
export type ProviderAuth =
  | {
      type: "bearer";
      apiKeyEnv: string;
      required: boolean;
    }
  | {
      type: "header";
      headerName: string;
      apiKeyEnv: string;
      required: boolean;
    }
  | {
      type: "none";
    };

export type ModelDiscoveryConfig = {
  /** Relative or absolute path for listing models, when supported. */
  path?: string;
  /** When true, the launcher may fall back to the static catalog. */
  allowStaticFallback?: boolean;
};

export type ProviderModel = {
  id: string;
  label: string;
  aliases?: string[];
  limits?: {
    contextTokens?: number;
    outputTokens?: number;
  };
  capabilities?: {
    text?: boolean;
    streaming?: boolean;
    tools?: boolean;
    parallelTools?: boolean;
    vision?: boolean;
    reasoning?: boolean;
    temperature?: boolean;
    jsonMode?: boolean;
  };
  pricing?: {
    currency: "USD";
    inputPerMillion?: number;
    outputPerMillion?: number;
    cachedInputPerMillion?: number;
    source?: string;
    updatedAt?: string;
  };
  verification?: {
    state: "untested" | "inferred" | "tested" | "recommended" | "regressed";
    testedAt?: string;
    testSuiteVersion?: string;
  };
};

/**
 * Built-in or user-defined provider profile. Must not hold resolved API keys.
 */
export type ProviderConfig = {
  id: string;
  label: string;
  baseURL: string;
  protocol: ProviderProtocol;
  auth: ProviderAuth;
  headers?: Record<string, string>;
  secretHeaderNames?: string[];
  queryParams?: Record<string, string>;
  models: ProviderModel[];
  modelDiscovery?: ModelDiscoveryConfig;
  compatibilityPolicyId?: string;
};

/**
 * Versioned request-shaping rules for a provider. Together's policy encodes
 * the behavior the proxies already apply implicitly (max_tokens field, stream
 * usage, etc.).
 */
export type ProviderCompatibilityPolicy = {
  id: string;
  version: string;
  stripRequestFields?: string[];
  renameRequestFields?: Record<string, string>;
  allowedToolChoiceValues?: string[];
  supportsStreamUsage?: boolean;
  supportsStrictTools?: boolean;
  supportsParallelTools?: boolean;
  maxTemperature?: number;
  endpointPath?: string;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
  responseUsageMode?: "standard" | "stream-final" | "unavailable";
};

/**
 * Non-secret endpoint snapshot that can ride on session registration JSON.
 * Secrets remain on `apiKey` (M2 will remove plaintext persistence).
 */
export type ProviderEndpointConfig = {
  id: string;
  label: string;
  baseURL: string;
  protocol: ProviderProtocol;
  auth: ProviderAuth;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  compatibilityPolicyId?: string;
};

/**
 * In-memory runtime for one session: endpoint config + resolved credential.
 * Never write this whole object to disk (apiKey is secret).
 */
export type ProviderRuntime = ProviderEndpointConfig & {
  apiKey: string;
};

/**
 * Options for the shared upstream chat-completions HTTP client.
 * Defaults (when baseURL/auth omitted) match the historical Together path.
 */
export type UpstreamClientOptions = {
  apiKey: string;
  /** Defaults to Together base URL when omitted. */
  baseURL?: string | undefined;
  /** Defaults to bearer auth when omitted. */
  auth?: ProviderAuth | undefined;
  /** Extra static request headers (merged after Content-Type / auth). */
  headers?: Record<string, string> | undefined;
  /** Optional query string parameters on the chat-completions URL. */
  queryParams?: Record<string, string> | undefined;
  debug?: boolean | undefined;
};
