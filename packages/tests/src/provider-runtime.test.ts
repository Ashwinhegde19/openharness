import { describe, expect, test, vi } from "vitest";
import { TOGETHER_BASE_URL, SELECTABLE_MODELS } from "@openharness/models";
import {
  TOGETHER_COMPATIBILITY_POLICY,
  TOGETHER_PROVIDER_CONFIG,
  TOGETHER_PROVIDER_ID,
  buildAuthHeaders,
  modelDefinitionToProviderModel,
  resolveProviderRuntime,
  toUpstreamClientOptions,
  togetherEndpointConfig,
  togetherProviderModels,
  togetherProviderRuntime,
} from "../../cli/src/lib/provider/index.js";
import {
  chatCompletionsUrl,
  postChatCompletion,
  upstreamRequestHeaders,
} from "../../cli/src/lib/together-client.js";
import { buildSession, type RegisterSessionRequest } from "../../cli/src/lib/daemon/state.js";
import { buildOpencodeConfigJson } from "../../cli/src/lib/opencode/core.js";
import {
  OPENCODE_MODEL_WHITELIST,
  OPENCODE_PROVIDER_ID,
} from "../../cli/src/lib/opencode/defaults.js";
import type { ModelDefinition } from "@openharness/models";

const MODEL_DEF: ModelDefinition = {
  id: "zai-org/GLM-5.2",
  name: "GLM 5.2",
  anthropicAlias: "together-glm-5-2",
  cost: { input: 1.4, output: 4.4, cache_read: 0.26 },
  limit: { context: 262144, output: 164000 },
  attachment: false,
  reasoning: true,
  temperature: true,
  tool_call: true,
  modalities: { input: ["text"], output: ["text"] },
};

describe("Together provider preset (M1-01)", () => {
  test("maps catalog models into ProviderModel[] without dropping selectable ids", () => {
    const models = togetherProviderModels();
    expect(models.map((m) => m.id)).toEqual(SELECTABLE_MODELS.map((m) => m.id));
    const glm = models.find((m) => m.id === "zai-org/GLM-5.2");
    expect(glm?.label).toBe("GLM 5.2 · default");
    expect(glm?.capabilities?.tools).toBe(true);
    expect(glm?.pricing?.inputPerMillion).toBe(1.4);
    expect(glm?.aliases).toContain("together-glm-5-2");
  });

  test("modelDefinitionToProviderModel preserves vision capability", () => {
    const vision = modelDefinitionToProviderModel({
      ...MODEL_DEF,
      id: "vision/model",
      attachment: true,
      modalities: { input: ["text", "image"], output: ["text"] },
    });
    expect(vision.capabilities?.vision).toBe(true);
  });

  test("TOGETHER_PROVIDER_CONFIG is a complete openai-chat bearer preset", () => {
    expect(TOGETHER_PROVIDER_CONFIG.id).toBe(TOGETHER_PROVIDER_ID);
    expect(TOGETHER_PROVIDER_CONFIG.baseURL).toBe(TOGETHER_BASE_URL);
    expect(TOGETHER_PROVIDER_CONFIG.protocol).toBe("openai-chat");
    expect(TOGETHER_PROVIDER_CONFIG.auth).toEqual({
      type: "bearer",
      apiKeyEnv: "TOGETHER_API_KEY",
      required: true,
    });
    expect(TOGETHER_PROVIDER_CONFIG.compatibilityPolicyId).toBe(TOGETHER_COMPATIBILITY_POLICY.id);
    expect(TOGETHER_PROVIDER_CONFIG.models.length).toBeGreaterThan(0);
  });
});

describe("ProviderCompatibilityPolicy (M1-02)", () => {
  test("Together policy matches current implicit chat-completions behavior", () => {
    expect(TOGETHER_COMPATIBILITY_POLICY.tokenLimitField).toBe("max_tokens");
    expect(TOGETHER_COMPATIBILITY_POLICY.endpointPath).toBe("/chat/completions");
    expect(TOGETHER_COMPATIBILITY_POLICY.supportsStreamUsage).toBe(true);
    expect(TOGETHER_COMPATIBILITY_POLICY.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("upstream client parameterization (M1-03)", () => {
  test("chatCompletionsUrl defaults to Together and honors baseURL + queryParams", () => {
    expect(chatCompletionsUrl({ apiKey: "k" })).toBe(`${TOGETHER_BASE_URL}/chat/completions`);
    expect(chatCompletionsUrl({ apiKey: "k", baseURL: "http://127.0.0.1:11434/v1" })).toBe(
      "http://127.0.0.1:11434/v1/chat/completions",
    );
    expect(
      chatCompletionsUrl({
        apiKey: "k",
        baseURL: "https://example.test/v1/",
        queryParams: { foo: "bar" },
      }),
    ).toBe("https://example.test/v1/chat/completions?foo=bar");
  });

  test("upstreamRequestHeaders defaults to bearer and supports custom header auth", () => {
    expect(upstreamRequestHeaders({ apiKey: "secret" })).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer secret",
    });
    expect(
      upstreamRequestHeaders({
        apiKey: "secret",
        auth: { type: "header", headerName: "X-Api-Key", apiKeyEnv: "K", required: true },
        headers: { "X-Title": "openharness" },
      }),
    ).toMatchObject({
      "X-Api-Key": "secret",
      "X-Title": "openharness",
    });
    expect(buildAuthHeaders({ type: "none" }, "x")).toEqual({});
  });

  test("postChatCompletion uses the configured baseURL", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(JSON.stringify({ id: "ok", choices: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    await postChatCompletion(
      { model: "m", messages: [] },
      { apiKey: "k", baseURL: "https://mock.provider/v1" },
    );
    expect(urls).toEqual(["https://mock.provider/v1/chat/completions"]);
    vi.unstubAllGlobals();
  });
});

describe("session ProviderRuntime (M1-04)", () => {
  test("buildSession defaults provider to Together and threads it into proxy options", () => {
    const req: RegisterSessionRequest = {
      token: "tok",
      authToken: "auth",
      agent: "claude",
      apiKey: "test-key",
      modelLabel: "GLM 5.2",
      modelId: "together-glm-5-2",
      targetModelId: "zai-org/GLM-5.2",
      modelName: "GLM 5.2",
      modelDefinition: MODEL_DEF,
    };
    const state = buildSession(req);
    expect(state.provider.id).toBe(TOGETHER_PROVIDER_ID);
    expect(state.provider.baseURL).toBe(TOGETHER_BASE_URL);
    expect(state.provider.apiKey).toBe("test-key");
    expect(state.options?.baseURL).toBe(TOGETHER_BASE_URL);
    expect(state.options?.apiKey).toBe("test-key");
    expect(state.options?.auth).toEqual({
      type: "bearer",
      apiKeyEnv: "TOGETHER_API_KEY",
      required: true,
    });
  });

  test("buildSession honors an explicit non-Together provider endpoint", () => {
    const state = buildSession({
      token: "tok",
      agent: "codex",
      apiKey: "local-key",
      provider: {
        id: "ollama",
        label: "Ollama",
        baseURL: "http://127.0.0.1:11434/v1",
        protocol: "openai-chat",
        auth: { type: "none" },
      },
      modelLabel: "local",
      modelDefinition: MODEL_DEF,
      modelId: "llama",
      targetModelId: "llama",
      modelName: "llama",
    });
    expect(state.provider.id).toBe("ollama");
    expect(state.options?.baseURL).toBe("http://127.0.0.1:11434/v1");
    expect(state.options?.auth).toEqual({ type: "none" });
  });

  test("resolveProviderRuntime / toUpstreamClientOptions round-trip", () => {
    const runtime = resolveProviderRuntime(togetherEndpointConfig(), "k");
    expect(runtime).toEqual(togetherProviderRuntime("k"));
    expect(toUpstreamClientOptions(runtime, true)).toMatchObject({
      apiKey: "k",
      baseURL: TOGETHER_BASE_URL,
      debug: true,
    });
  });
});

describe("OpenCode provider-driven config (M1-05)", () => {
  test("Together preset produces the same provider id, name, and whitelist", () => {
    const config = buildOpencodeConfigJson({ modelId: SELECTABLE_MODELS[0]!.id });
    const block = config.provider?.[OPENCODE_PROVIDER_ID] as {
      name: string;
      npm: string;
      whitelist: string[];
      options: { apiKey: string };
    };
    expect(block.name).toBe("Together AI");
    expect(block.npm).toBe("@ai-sdk/togetherai");
    expect(block.options.apiKey).toBe("{env:TOGETHER_API_KEY}");
    expect(block.whitelist).toEqual(OPENCODE_MODEL_WHITELIST);
    expect(config.enabled_providers).toEqual([OPENCODE_PROVIDER_ID]);
  });
});
