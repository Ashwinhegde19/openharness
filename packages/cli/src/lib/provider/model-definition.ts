import type { ModelDefinition } from "@openharness/models";
import type { ProviderModel } from "./types.js";

/**
 * Build a CostTracker-compatible {@link ModelDefinition} from a provider-neutral
 * {@link ProviderModel}. Used when Claude/Codex route through non-Together
 * presets that are not in the curated Together catalog.
 */
export function modelDefinitionFromProviderModel(model: ProviderModel): ModelDefinition {
  const vision = model.capabilities?.vision === true;
  return {
    id: model.id,
    name: model.label,
    anthropicAlias: null,
    cost: {
      input: model.pricing?.inputPerMillion ?? 0,
      output: model.pricing?.outputPerMillion ?? 0,
      cache_read: model.pricing?.cachedInputPerMillion ?? 0,
    },
    limit: {
      context: model.limits?.contextTokens ?? 128_000,
      output: model.limits?.outputTokens ?? 16_384,
    },
    attachment: vision,
    reasoning: model.capabilities?.reasoning === true,
    temperature: model.capabilities?.temperature !== false,
    tool_call: model.capabilities?.tools !== false,
    modalities: {
      input: vision ? ["text", "image"] : ["text"],
      output: ["text"],
    },
  };
}

/** Stable Claude-facing alias for an arbitrary upstream model id. */
export function claudeAliasForUpstreamId(id: string): string {
  const cleaned = id
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 80) || "custom-model";
}
