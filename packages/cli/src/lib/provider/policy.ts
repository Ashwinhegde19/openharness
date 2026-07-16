import type { ProviderCompatibilityPolicy } from "./types.js";

/**
 * Together AI chat-completions policy — matches the behavior already baked into
 * the Claude/Codex proxies and together-client (max_tokens, stream usage on the
 * final chunk where available, no field stripping today).
 */
export const TOGETHER_COMPATIBILITY_POLICY: ProviderCompatibilityPolicy = {
  id: "together-openai-chat",
  version: "1.0.0",
  endpointPath: "/chat/completions",
  tokenLimitField: "max_tokens",
  supportsStreamUsage: true,
  supportsStrictTools: false,
  supportsParallelTools: true,
  responseUsageMode: "standard",
};

/**
 * Ollama OpenAI-compatible chat policy. Local models vary widely; we do not
 * strip fields aggressively and leave tool/stream capability to discovery.
 */
export const OLLAMA_COMPATIBILITY_POLICY: ProviderCompatibilityPolicy = {
  id: "ollama-openai-chat",
  version: "1.0.0",
  endpointPath: "/chat/completions",
  tokenLimitField: "max_tokens",
  supportsStreamUsage: true,
  supportsStrictTools: false,
  supportsParallelTools: true,
  responseUsageMode: "standard",
};

const POLICIES: Record<string, ProviderCompatibilityPolicy> = {
  [TOGETHER_COMPATIBILITY_POLICY.id]: TOGETHER_COMPATIBILITY_POLICY,
  [OLLAMA_COMPATIBILITY_POLICY.id]: OLLAMA_COMPATIBILITY_POLICY,
};

/** Look up a versioned policy by id; unknown ids return undefined. */
export function getCompatibilityPolicy(id: string): ProviderCompatibilityPolicy | undefined {
  return POLICIES[id];
}

/** Together policy remains the product default preset. */
export function defaultCompatibilityPolicy(): ProviderCompatibilityPolicy {
  return TOGETHER_COMPATIBILITY_POLICY;
}
