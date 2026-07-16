import { describe, expect, test, vi } from "vitest";
import {
  OLLAMA_COMPATIBILITY_POLICY,
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_PROVIDER_ID,
  buildOllamaProviderConfig,
  discoverOllamaModels,
  getBuiltinProvider,
  listBuiltinProviderIds,
  ollamaModelFromId,
} from "../../cli/src/lib/provider/index.js";
import {
  buildOpencodeConfigJson,
  buildOpencodeEnv,
  isSessionOnlyOpencodeLaunch,
  opencodeNpmFor,
  opencodeProviderIdFor,
} from "../../cli/src/lib/opencode/core.js";
import { OPENCODE_PROVIDER_ID } from "../../cli/src/lib/opencode/defaults.js";
import { parseArgs } from "../../cli/src/lib/parse-args.js";

describe("Ollama provider preset (M3)", () => {
  test("builtin registry lists together, ollama, and openrouter", () => {
    expect(listBuiltinProviderIds()).toEqual(["together", "ollama", "openrouter"]);
    expect(getBuiltinProvider("ollama")?.id).toBe(OLLAMA_PROVIDER_ID);
    expect(getBuiltinProvider("ollama")?.auth).toEqual({ type: "none" });
    expect(getBuiltinProvider("ollama")?.baseURL).toBe(OLLAMA_DEFAULT_BASE_URL);
  });

  test("buildOllamaProviderConfig accepts baseURL and models", () => {
    const config = buildOllamaProviderConfig({
      baseURL: "http://192.168.1.10:11434/v1/",
      models: [ollamaModelFromId("llama3.2")],
    });
    expect(config.baseURL).toBe("http://192.168.1.10:11434/v1");
    expect(config.models).toHaveLength(1);
    expect(config.compatibilityPolicyId).toBe(OLLAMA_COMPATIBILITY_POLICY.id);
    expect(config.auth.type).toBe("none");
  });

  test("compatibility policy is registered", () => {
    expect(OLLAMA_COMPATIBILITY_POLICY.endpointPath).toBe("/chat/completions");
    expect(OLLAMA_COMPATIBILITY_POLICY.tokenLimitField).toBe("max_tokens");
  });
});

describe("Ollama model discovery", () => {
  test("parses OpenAI-compatible /v1/models", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toBe(`${OLLAMA_DEFAULT_BASE_URL}/models`);
      return new Response(
        JSON.stringify({
          data: [{ id: "llama3.2:latest" }, { id: "qwen2.5-coder:7b" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await discoverOllamaModels({ fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models.map((m) => m.id)).toEqual(["llama3.2:latest", "qwen2.5-coder:7b"]);
    }
  });

  test("falls back to /api/tags when /v1/models fails", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/models")) {
        return new Response("nope", { status: 404 });
      }
      if (url.endsWith("/api/tags")) {
        return new Response(JSON.stringify({ models: [{ name: "mistral:latest" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("missing", { status: 500 });
    }) as unknown as typeof fetch;

    const result = await discoverOllamaModels({ fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models.map((m) => m.id)).toEqual(["mistral:latest"]);
    }
  });

  test("reports empty catalog when reachable but no models", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const result = await discoverOllamaModels({ fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no models/i);
    }
  });

  test("reports connection failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const result = await discoverOllamaModels({ fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Could not reach Ollama|ECONNREFUSED/);
    }
  });
});

describe("OpenCode config for Ollama (session-only)", () => {
  test("uses openai-compatible npm package and baseURL", () => {
    const provider = buildOllamaProviderConfig({
      models: [ollamaModelFromId("llama3.2"), ollamaModelFromId("codellama")],
    });
    expect(opencodeNpmFor(provider)).toBe("@ai-sdk/openai-compatible");
    expect(opencodeProviderIdFor(provider)).toBe("ollama");

    const config = buildOpencodeConfigJson({
      provider,
      modelId: "llama3.2",
    });

    const block = config.provider?.ollama as {
      npm: string;
      name: string;
      options: { baseURL?: string; apiKey?: string };
      whitelist: string[];
      models: Record<string, { name: string }>;
    };
    expect(block.npm).toBe("@ai-sdk/openai-compatible");
    expect(block.name).toBe("Ollama");
    expect(block.options.baseURL).toBe(OLLAMA_DEFAULT_BASE_URL);
    expect(block.options.apiKey).toBeUndefined();
    expect(block.whitelist).toEqual(["llama3.2", "codellama"]);
    expect(config.model).toBe("ollama/llama3.2");
    expect(config.enabled_providers).toEqual(["ollama"]);
    // No Together vision subagent on pure Ollama launches.
    expect(config.agent?.vision).toBeUndefined();
  });

  test("buildOpencodeEnv does not require an API key for no-auth providers", () => {
    const provider = buildOllamaProviderConfig({
      models: [ollamaModelFromId("llama3.2")],
    });
    const configJson = buildOpencodeConfigJson({ provider, modelId: "llama3.2" });
    const env = buildOpencodeEnv({ configJson });
    expect(isSessionOnlyOpencodeLaunch(env)).toBe(true);
    expect(env.OPENCODE_CONFIG_CONTENT).toContain("ollama");
    expect(env.TOGETHER_API_KEY).toBeUndefined();
  });

  test("rejects unknown model ids with a clear diagnostic", () => {
    const provider = buildOllamaProviderConfig({
      models: [ollamaModelFromId("llama3.2")],
    });
    expect(() => buildOpencodeConfigJson({ provider, modelId: "not-pulled" })).toThrow(
      /not available/i,
    );
  });

  test("Together path still uses togetherai adapter (regression)", () => {
    const config = buildOpencodeConfigJson({});
    const block = config.provider?.[OPENCODE_PROVIDER_ID] as { npm: string };
    expect(block.npm).toBe("@ai-sdk/togetherai");
    expect(config.agent?.vision).toBeDefined();
  });
});

describe("CLI flags for provider selection", () => {
  test("parses --provider and --base-url before the harness", () => {
    const parsed = parseArgs([
      "--provider",
      "ollama",
      "--base-url",
      "http://127.0.0.1:11434/v1",
      "--main",
      "llama3.2",
      "opencode",
    ]);
    expect(parsed.flags.provider).toBe("ollama");
    expect(parsed.flags.baseUrl).toBe("http://127.0.0.1:11434/v1");
    expect(parsed.flags.main).toBe("llama3.2");
    expect(parsed.positional[0]).toBe("opencode");
  });
});
