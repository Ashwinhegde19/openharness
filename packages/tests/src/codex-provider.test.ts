import { describe, expect, test } from "vitest";
import { CODEX_DEFAULT_PROVIDER_ID } from "../../cli/src/lib/harnesses/codex.js";
import {
  TOGETHER_PROVIDER_ID,
  OPENROUTER_PROVIDER_ID,
  OLLAMA_PROVIDER_ID,
  OPENROUTER_DEFAULT_MODEL,
  modelDefinitionFromProviderModel,
  openrouterModelFromId,
  ollamaModelFromId,
  openrouterEndpointConfig,
  ollamaEndpointConfig,
  togetherEndpointConfig,
} from "../../cli/src/lib/provider/index.js";
import { codexModelCatalog, codexModelCatalogJson } from "../../cli/src/lib/codex/catalog.js";
import { peelProductFlags } from "../../cli/src/lib/cli-flags.js";
import { resolveCodexRequestModel } from "../../cli/src/lib/codex/translate-request.js";

describe("Codex multi-provider helpers (M6)", () => {
  test("Codex default provider remains Together for backward compatibility", () => {
    expect(CODEX_DEFAULT_PROVIDER_ID).toBe(TOGETHER_PROVIDER_ID);
  });

  test("catalog accepts custom models and provider label", () => {
    const definition = modelDefinitionFromProviderModel(
      openrouterModelFromId(OPENROUTER_DEFAULT_MODEL, "GPT-4o Mini"),
    );
    const catalog = codexModelCatalog({
      models: [{ id: OPENROUTER_DEFAULT_MODEL, definition }],
      providerLabel: "OpenRouter",
    });
    expect(catalog.models).toHaveLength(1);
    expect(catalog.models[0]?.slug).toBe(OPENROUTER_DEFAULT_MODEL);
    expect(String(catalog.models[0]?.description)).toMatch(/OpenRouter/);
    expect(codexModelCatalogJson({ models: [{ id: definition.id, definition }] })).toContain(
      OPENROUTER_DEFAULT_MODEL,
    );
  });

  test("resolveCodexRequestModel falls back to session modelDefinition", () => {
    const definition = modelDefinitionFromProviderModel(ollamaModelFromId("llama3.2"));
    const resolved = resolveCodexRequestModel(
      { model: "llama3.2" },
      {
        modelId: "llama3.2",
        targetModelId: "llama3.2",
        modelDefinition: definition,
      },
    );
    expect(resolved.targetModelId).toBe("llama3.2");
    expect(resolved.definition.id).toBe("llama3.2");
  });

  test("provider endpoints for Codex path", () => {
    expect(togetherEndpointConfig().baseURL).toContain("together.ai");
    expect(openrouterEndpointConfig().baseURL).toContain("openrouter.ai");
    expect(ollamaEndpointConfig().auth.type).toBe("none");
    expect([TOGETHER_PROVIDER_ID, OPENROUTER_PROVIDER_ID, OLLAMA_PROVIDER_ID]).toEqual([
      "together",
      "openrouter",
      "ollama",
    ]);
  });

  test("peelProductFlags works for codex-style argv", () => {
    const peeled = peelProductFlags(["--provider", "ollama", "--main", "llama3.2", "exec", "hi"]);
    expect(peeled.provider).toBe("ollama");
    expect(peeled.main).toBe("llama3.2");
    expect(peeled.rest).toEqual(["exec", "hi"]);
  });
});
