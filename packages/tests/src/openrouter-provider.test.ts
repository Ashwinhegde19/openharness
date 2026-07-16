import { describe, expect, test, vi } from "vitest";
import {
  OPENROUTER_API_KEY_ENV,
  OPENROUTER_COMPATIBILITY_POLICY,
  OPENROUTER_CURATED_MODELS,
  OPENROUTER_DEFAULT_BASE_URL,
  OPENROUTER_DEFAULT_HEADERS,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_PROVIDER_ID,
  buildOpenRouterProviderConfig,
  discoverOpenRouterModels,
  getBuiltinProvider,
  listBuiltinProviderIds,
  mergeOpenRouterCatalog,
  openrouterModelFromId,
} from "../../cli/src/lib/provider/index.js";
import {
  buildOpencodeConfigJson,
  buildOpencodeEnv,
  isSessionOnlyOpencodeLaunch,
  opencodeNpmFor,
  opencodeProviderIdFor,
} from "../../cli/src/lib/opencode/core.js";
import { parseArgs } from "../../cli/src/lib/parse-args.js";

describe("OpenRouter provider preset (M4)", () => {
  test("registry lists together, ollama, and openrouter", () => {
    expect(listBuiltinProviderIds()).toEqual(["together", "ollama", "openrouter"]);
    const preset = getBuiltinProvider("openrouter");
    expect(preset?.id).toBe(OPENROUTER_PROVIDER_ID);
    expect(preset?.baseURL).toBe(OPENROUTER_DEFAULT_BASE_URL);
    expect(preset?.auth).toEqual({
      type: "bearer",
      apiKeyEnv: OPENROUTER_API_KEY_ENV,
      required: true,
    });
    expect(preset?.headers).toMatchObject(OPENROUTER_DEFAULT_HEADERS);
  });

  test("curated models use namespaced ids", () => {
    expect(OPENROUTER_CURATED_MODELS.every((m) => m.id.includes("/"))).toBe(true);
    expect(OPENROUTER_DEFAULT_MODEL).toBe("openai/gpt-4o-mini");
    expect(OPENROUTER_COMPATIBILITY_POLICY.id).toBe("openrouter-openai-chat");
  });

  test("buildOpenRouterProviderConfig accepts baseURL and models", () => {
    const config = buildOpenRouterProviderConfig({
      baseURL: "https://openrouter.ai/api/v1/",
      models: [openrouterModelFromId("openai/gpt-4o-mini")],
    });
    expect(config.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(config.models).toHaveLength(1);
  });
});

describe("OpenRouter model discovery", () => {
  test("parses /models with pricing and vision hints", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`${OPENROUTER_DEFAULT_BASE_URL}/models`);
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "openai/gpt-4o-mini",
              name: "GPT-4o Mini",
              context_length: 128000,
              pricing: { prompt: "0.00000015", completion: "0.0000006" },
              architecture: { input_modalities: ["text", "image"] },
            },
            {
              id: "meta-llama/llama-3.3-70b-instruct",
              name: "Llama 3.3 70B",
              context_length: 131072,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await discoverOpenRouterModels({ apiKey: "test-key", fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models[0]?.id).toBe("openai/gpt-4o-mini");
      expect(result.models[0]?.capabilities?.vision).toBe(true);
      expect(result.models[0]?.pricing?.inputPerMillion).toBeCloseTo(0.15, 5);
    }
  });

  test("maps 401 to a clear auth error", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("unauthorized", { status: 401 }),
    ) as unknown as typeof fetch;
    const result = await discoverOpenRouterModels({ apiKey: "bad", fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toMatch(/API key/i);
    }
  });

  test("maps 429 to a rate-limit error", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("slow down", { status: 429 }),
    ) as unknown as typeof fetch;
    const result = await discoverOpenRouterModels({ apiKey: "k", fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.error).toMatch(/rate-limited/i);
    }
  });
});

describe("mergeOpenRouterCatalog", () => {
  test("prefers curated models present in discovery", () => {
    const merged = mergeOpenRouterCatalog({
      discovered: [
        openrouterModelFromId("openai/gpt-4o-mini"),
        openrouterModelFromId("some-org/obscure-model"),
      ],
    });
    expect(merged.map((m) => m.id)).toContain("openai/gpt-4o-mini");
    expect(merged.map((m) => m.id)).not.toContain("some-org/obscure-model");
  });

  test("includes an explicit requested model even if not curated", () => {
    const merged = mergeOpenRouterCatalog({
      discovered: [openrouterModelFromId("openai/gpt-4o-mini")],
      requested: "vendor/custom-coder",
    });
    expect(merged.map((m) => m.id)).toContain("vendor/custom-coder");
  });

  test("falls back to full curated list without discovery", () => {
    const merged = mergeOpenRouterCatalog({});
    expect(merged.map((m) => m.id)).toEqual(OPENROUTER_CURATED_MODELS.map((m) => m.id));
  });
});

describe("OpenCode config for OpenRouter (session-only)", () => {
  test("uses openai-compatible npm, baseURL, headers, and env key ref", () => {
    const provider = buildOpenRouterProviderConfig({
      models: [
        openrouterModelFromId("openai/gpt-4o-mini"),
        openrouterModelFromId("anthropic/claude-sonnet-4"),
      ],
    });
    expect(opencodeNpmFor(provider)).toBe("@ai-sdk/openai-compatible");
    expect(opencodeProviderIdFor(provider)).toBe("openrouter");

    const config = buildOpencodeConfigJson({
      provider,
      modelId: OPENROUTER_DEFAULT_MODEL,
    });
    const block = config.provider?.openrouter as {
      npm: string;
      name: string;
      options: {
        apiKey?: string;
        baseURL?: string;
        headers?: Record<string, string>;
      };
      whitelist: string[];
    };
    expect(block.npm).toBe("@ai-sdk/openai-compatible");
    expect(block.name).toBe("OpenRouter");
    expect(block.options.baseURL).toBe(OPENROUTER_DEFAULT_BASE_URL);
    expect(block.options.apiKey).toBe(`{env:${OPENROUTER_API_KEY_ENV}}`);
    expect(block.options.headers).toMatchObject(OPENROUTER_DEFAULT_HEADERS);
    expect(block.whitelist).toContain("openai/gpt-4o-mini");
    expect(config.model).toBe(`openrouter/${OPENROUTER_DEFAULT_MODEL}`);
    expect(config.enabled_providers).toEqual(["openrouter"]);
  });

  test("buildOpencodeEnv injects OPENROUTER_API_KEY for session only", () => {
    const provider = buildOpenRouterProviderConfig({
      models: [openrouterModelFromId(OPENROUTER_DEFAULT_MODEL)],
    });
    const configJson = buildOpencodeConfigJson({
      provider,
      modelId: OPENROUTER_DEFAULT_MODEL,
    });
    const env = buildOpencodeEnv({
      configJson,
      apiKey: "or-secret",
      apiKeyEnv: OPENROUTER_API_KEY_ENV,
    });
    expect(isSessionOnlyOpencodeLaunch(env)).toBe(true);
    expect(env.OPENROUTER_API_KEY).toBe("or-secret");
    expect(env.OPENCODE_CONFIG_CONTENT).toContain("openrouter");
    // Must not write a permanent path hint into the env contract.
    expect(env.OPENCODE_CONFIG).toBeUndefined();
  });
});

describe("CLI flags for OpenRouter", () => {
  test("parses --provider openrouter before the harness", () => {
    const parsed = parseArgs([
      "--provider",
      "openrouter",
      "--main",
      "openai/gpt-4o-mini",
      "opencode",
    ]);
    expect(parsed.flags.provider).toBe("openrouter");
    expect(parsed.flags.main).toBe("openai/gpt-4o-mini");
    expect(parsed.positional[0]).toBe("opencode");
  });
});
