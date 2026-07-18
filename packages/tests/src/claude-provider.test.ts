import { describe, expect, test } from "vitest";
import { CLAUDE_DEFAULT_PROVIDER_ID } from "../../cli/src/lib/harnesses/claude.js";
import {
  TOGETHER_PROVIDER_ID,
  OPENROUTER_PROVIDER_ID,
  OLLAMA_PROVIDER_ID,
  OPENROUTER_DEFAULT_MODEL,
  claudeAliasForUpstreamId,
  modelDefinitionFromProviderModel,
  openrouterModelFromId,
  ollamaModelFromId,
  openrouterEndpointConfig,
  ollamaEndpointConfig,
  togetherEndpointConfig,
} from "../../cli/src/lib/provider/index.js";
import { buildClaudeEnv } from "../../cli/src/lib/claude/core.js";
import { resolveTargetModel } from "../../cli/src/lib/claude/translate-response.js";
import { peelProductFlags } from "../../cli/src/lib/cli-flags.js";
import type { ModelDefinition } from "@openharness/models";

describe("Claude multi-provider helpers (M5)", () => {
  test("Claude default provider remains Together for backward compatibility", () => {
    expect(CLAUDE_DEFAULT_PROVIDER_ID).toBe(TOGETHER_PROVIDER_ID);
  });

  test("claudeAliasForUpstreamId sanitizes namespaced OpenRouter ids", () => {
    expect(claudeAliasForUpstreamId("openai/gpt-4o-mini")).toBe("openai-gpt-4o-mini");
    expect(claudeAliasForUpstreamId("  meta-llama/x:7b  ")).toMatch(/meta-llama/);
  });

  test("modelDefinitionFromProviderModel maps pricing and vision", () => {
    const def = modelDefinitionFromProviderModel(
      openrouterModelFromId("openai/gpt-4o-mini", "GPT-4o Mini"),
    );
    expect(def.id).toBe("openai/gpt-4o-mini");
    expect(def.name).toBe("GPT-4o Mini");
    expect(def.anthropicAlias).toBeNull();
    expect(def.tool_call).toBe(true);
  });

  test("resolveTargetModel prefers session registration for non-catalog models", () => {
    const definition: ModelDefinition = modelDefinitionFromProviderModel(
      openrouterModelFromId(OPENROUTER_DEFAULT_MODEL),
    );
    const resolved = resolveTargetModel("openai-gpt-4o-mini", {
      modelId: "openai-gpt-4o-mini",
      targetModelId: OPENROUTER_DEFAULT_MODEL,
      modelDefinition: definition,
    });
    expect(resolved.definition.id).toBe(OPENROUTER_DEFAULT_MODEL);
    expect(resolved.alias).toBe("openai-gpt-4o-mini");
  });

  test("buildClaudeEnv uses provider label and does not inject Together-only branding for custom models", () => {
    const definition = modelDefinitionFromProviderModel(ollamaModelFromId("llama3.2"));
    const env = buildClaudeEnv({
      modelId: "llama3.2",
      modelName: "llama3.2",
      proxyUrl: "http://127.0.0.1:7878/session/x",
      authToken: "local-token",
      providerLabel: "Ollama",
      modelDefinition: definition,
    });
    expect(env.ANTHROPIC_BASE_URL).toBe("http://127.0.0.1:7878/session/x");
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe("local-token");
    expect(env.ANTHROPIC_MODEL).toBe("llama3.2");
    expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION).toMatch(/Ollama/);
    expect(env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION).toMatch(/Ollama/);
  });

  test("provider endpoints differ by preset", () => {
    expect(togetherEndpointConfig().baseURL).toContain("together.ai");
    expect(openrouterEndpointConfig().baseURL).toContain("openrouter.ai");
    expect(ollamaEndpointConfig().baseURL).toContain("11434");
    expect(openrouterEndpointConfig().auth.type).toBe("bearer");
    expect(ollamaEndpointConfig().auth.type).toBe("none");
  });

  test("peelProductFlags extracts provider/main for claude argv style", () => {
    const peeled = peelProductFlags([
      "--provider",
      "openrouter",
      "--main",
      "openai/gpt-4o-mini",
      "--print",
      "hi",
    ]);
    expect(peeled.provider).toBe("openrouter");
    expect(peeled.main).toBe("openai/gpt-4o-mini");
    expect(peeled.rest).toEqual(["--print", "hi"]);
  });

  test("provider ids used by Claude path are recognized", () => {
    expect([TOGETHER_PROVIDER_ID, OPENROUTER_PROVIDER_ID, OLLAMA_PROVIDER_ID]).toEqual([
      "together",
      "openrouter",
      "ollama",
    ]);
  });
});
