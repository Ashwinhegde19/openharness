import { resolveCodexModel, CODEX_SUPPORTED_MODELS } from "../codex/defaults.js";
import { runCodexTogether } from "../codex/core.js";
import { peelProductFlags } from "../cli-flags.js";
import { HARNESS } from "../harness.js";
import { defineHarness, type HarnessContext, type HarnessResult } from "../harness-types.js";
import {
  OLLAMA_PROVIDER_ID,
  OPENROUTER_API_KEY_ENV,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_PROVIDER_ID,
  TOGETHER_PROVIDER_ID,
  buildOllamaProviderConfig,
  buildOpenRouterProviderConfig,
  discoverOllamaModels,
  discoverOpenRouterModels,
  getBuiltinProvider,
  isBuiltinProviderId,
  mergeOpenRouterCatalog,
  modelDefinitionFromProviderModel,
  ollamaEndpointConfig,
  ollamaModelFromId,
  openrouterEndpointConfig,
  openrouterModelFromId,
  togetherEndpointConfig,
  type ProviderConfig,
  type ProviderEndpointConfig,
  type ProviderModel,
} from "../provider/index.js";
import { resolveTogetherApiKey } from "../together-core.js";
import type { ModelDefinition } from "@openharness/models";

/** Codex default remains Together for backward compatibility. */
export const CODEX_DEFAULT_PROVIDER_ID = TOGETHER_PROVIDER_ID;

async function resolveOpenRouterApiKey(ctx: HarnessContext): Promise<string> {
  if (ctx.apiKey?.trim()) {
    return ctx.apiKey.trim();
  }
  const fromEnv = process.env[OPENROUTER_API_KEY_ENV]?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (ctx.home) {
    const { readGlobalConfig, resolveStoredOpenRouterApiKey } = await import("../global-config.js");
    const stored = resolveStoredOpenRouterApiKey(
      (await readGlobalConfig(ctx.home)).openrouterApiKey,
    );
    if (stored) {
      return stored;
    }
  }
  return "";
}

async function resolveCodexProvider(ctx: HarnessContext): Promise<{
  provider: ProviderConfig;
  endpoint: ProviderEndpointConfig;
  apiKey: string;
  models: ProviderModel[];
}> {
  const providerId = (ctx.provider ?? CODEX_DEFAULT_PROVIDER_ID).trim().toLowerCase();
  if (!isBuiltinProviderId(providerId) && providerId !== "togetherai") {
    throw new Error(
      `Unknown provider "${ctx.provider}". Supported for Codex: together, openrouter, ollama.`,
    );
  }

  if (providerId === OLLAMA_PROVIDER_ID) {
    const baseURL = ctx.baseUrl?.trim();
    const discovery = await discoverOllamaModels({
      ...(baseURL ? { baseURL } : {}),
    });
    const requested = ctx.main?.trim();
    if (!discovery.ok) {
      if (requested) {
        process.stderr.write(
          `openharness ▸ Warning: ${discovery.error} Using --main ${requested} without discovery.\n`,
        );
        const models = [ollamaModelFromId(requested)];
        const provider = buildOllamaProviderConfig({
          baseURL: discovery.baseURL,
          models,
        });
        return {
          provider,
          endpoint: ollamaEndpointConfig(discovery.baseURL),
          apiKey: "no-auth",
          models,
        };
      }
      throw new Error(discovery.error);
    }
    let models = discovery.models;
    if (requested && !models.some((m) => m.id === requested)) {
      models = [ollamaModelFromId(requested), ...models];
    }
    const provider = buildOllamaProviderConfig({ baseURL: discovery.baseURL, models });
    return {
      provider,
      endpoint: ollamaEndpointConfig(discovery.baseURL),
      apiKey: "no-auth",
      models,
    };
  }

  if (providerId === OPENROUTER_PROVIDER_ID) {
    const apiKey = await resolveOpenRouterApiKey(ctx);
    if (!apiKey) {
      throw new Error(
        "Codex + OpenRouter needs OPENROUTER_API_KEY (or --api-key / configure). " +
          "Get a key at https://openrouter.ai/keys",
      );
    }
    const baseURL = ctx.baseUrl?.trim();
    const discovery = await discoverOpenRouterModels({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    const requested = ctx.main?.trim();
    if (!discovery.ok) {
      process.stderr.write(
        `openharness ▸ Warning: ${discovery.error} Using curated OpenRouter catalog.\n`,
      );
      const models = mergeOpenRouterCatalog({ requested });
      const provider = buildOpenRouterProviderConfig({
        baseURL: discovery.baseURL,
        models,
      });
      return {
        provider,
        endpoint: openrouterEndpointConfig(discovery.baseURL),
        apiKey,
        models,
      };
    }
    const models = mergeOpenRouterCatalog({
      discovered: discovery.models,
      requested,
    });
    const provider = buildOpenRouterProviderConfig({
      baseURL: discovery.baseURL,
      models,
    });
    return {
      provider,
      endpoint: openrouterEndpointConfig(discovery.baseURL),
      apiKey,
      models,
    };
  }

  const apiKey = await resolveTogetherApiKey({
    apiKey: ctx.apiKey,
    home: ctx.home,
  });
  if (!apiKey) {
    throw new Error(
      "Codex with the Together preset needs a key. " +
        "Pass --api-key, set TOGETHER_API_KEY, or run `openharness configure`. " +
        "Or use a non-Together provider: " +
        "`openharness codex --provider openrouter --main openai/gpt-4o-mini` " +
        "or `--provider ollama --main llama3.2`.",
    );
  }
  const provider = getBuiltinProvider(TOGETHER_PROVIDER_ID);
  if (!provider) {
    throw new Error("Together provider preset is missing from the registry.");
  }
  return {
    provider,
    endpoint: togetherEndpointConfig(),
    apiKey,
    models: provider.models,
  };
}

function resolveCodexLaunchModel(
  providerId: string,
  models: ProviderModel[],
  requested: string | undefined,
): {
  id: string;
  modelName: string;
  modelDefinition: ModelDefinition;
  catalogModels: Array<{ id: string; definition: ModelDefinition }>;
} {
  if (providerId === TOGETHER_PROVIDER_ID || providerId === "togetherai") {
    const selected = resolveCodexModel(requested);
    return {
      id: selected.definition.id,
      modelName: selected.definition.name,
      modelDefinition: selected.definition,
      catalogModels: CODEX_SUPPORTED_MODELS.map((m) => ({
        id: m.id,
        definition: m.definition,
      })),
    };
  }

  const id =
    requested?.trim() ||
    (providerId === OPENROUTER_PROVIDER_ID
      ? (models.find((m) => m.id === OPENROUTER_DEFAULT_MODEL)?.id ?? models[0]?.id)
      : models[0]?.id);

  if (!id) {
    throw new Error(
      `No model available for Codex on provider "${providerId}". Pass --main <model-id>.`,
    );
  }

  const meta = models.find((m) => m.id === id) ?? openrouterModelFromId(id);
  const definition = modelDefinitionFromProviderModel(meta);
  const catalogModels = models.map((m) => ({
    id: m.id,
    definition: modelDefinitionFromProviderModel(m),
  }));
  // Ensure selected model is in the catalog.
  if (!catalogModels.some((m) => m.id === id)) {
    catalogModels.unshift({ id, definition });
  }
  return {
    id,
    modelName: meta.label,
    modelDefinition: definition,
    catalogModels,
  };
}

export default defineHarness({
  id: HARNESS.CODEX,
  label: "Codex",

  async run(ctx: HarnessContext): Promise<HarnessResult> {
    const peeled = peelProductFlags(ctx.passthrough ?? []);
    const effective: HarnessContext = {
      ...ctx,
      passthrough: peeled.rest,
      ...(peeled.provider !== undefined ? { provider: peeled.provider } : {}),
      ...(peeled.baseUrl !== undefined ? { baseUrl: peeled.baseUrl } : {}),
      ...(peeled.main !== undefined ? { main: peeled.main } : {}),
      ...(peeled.apiKey !== undefined ? { apiKey: peeled.apiKey } : {}),
    };

    const resolved = await resolveCodexProvider(effective);
    const providerId = resolved.provider.id;
    const model = resolveCodexLaunchModel(providerId, resolved.models, effective.main);

    if (providerId === OPENROUTER_PROVIDER_ID) {
      process.stderr.write(
        `openharness ▸ Cloud destination: OpenRouter (${resolved.endpoint.baseURL}). ` +
          `Prompts leave this machine.\n`,
      );
    }

    const result = await runCodexTogether({
      apiKey: resolved.apiKey,
      home: effective.home,
      modelId: model.id,
      targetModelId: model.id,
      modelName: model.modelName,
      modelDefinition: model.modelDefinition,
      catalogModels: model.catalogModels,
      provider: resolved.endpoint,
      providerLabel: resolved.provider.label,
      ...(effective.passthrough ? { args: effective.passthrough } : {}),
    });

    if (typeof result.status === "number") {
      process.exitCode = result.status;
    }
    return {};
  },
});
