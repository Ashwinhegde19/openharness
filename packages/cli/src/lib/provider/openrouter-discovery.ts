import {
  OPENROUTER_CURATED_MODELS,
  OPENROUTER_DEFAULT_BASE_URL,
  openrouterModelFromId,
} from "./openrouter-preset.js";
import type { ProviderModel } from "./types.js";

export type OpenRouterDiscoveryResult =
  | { ok: true; models: ProviderModel[]; baseURL: string }
  | { ok: false; error: string; baseURL: string; status?: number };

type FetchLike = typeof fetch;

/**
 * Discover models from OpenRouter's OpenAI-compatible `/models` endpoint.
 * Requires a bearer API key. On failure, callers should fall back to the
 * curated static catalog.
 */
export async function discoverOpenRouterModels(options: {
  apiKey: string;
  baseURL?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Cap models returned to keep OpenCode /models usable. */
  limit?: number;
}): Promise<OpenRouterDiscoveryResult> {
  const baseURL = (options.baseURL ?? OPENROUTER_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const limit = options.limit ?? 80;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetchImpl(`${baseURL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        baseURL,
        status: response.status,
        error:
          `OpenRouter rejected the API key (HTTP ${response.status}). ` +
          `Check OPENROUTER_API_KEY or pass --api-key.`,
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        baseURL,
        status: 429,
        error: "OpenRouter rate-limited model discovery (HTTP 429). Retry shortly.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        baseURL,
        status: response.status,
        error: `OpenRouter model discovery failed (HTTP ${response.status}).`,
      };
    }

    const json = (await response.json()) as {
      data?: Array<{
        id?: string;
        name?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
        architecture?: { input_modalities?: string[]; modality?: string };
      }>;
    };

    const models: ProviderModel[] = [];
    for (const entry of json.data ?? []) {
      const id = entry.id?.trim();
      if (!id) {
        continue;
      }
      const vision =
        entry.architecture?.input_modalities?.includes("image") === true ||
        entry.architecture?.modality === "multimodal";
      const inputPerMillion = parsePricePerTokenToMillion(entry.pricing?.prompt);
      const outputPerMillion = parsePricePerTokenToMillion(entry.pricing?.completion);
      models.push({
        id,
        label: entry.name?.trim() || id,
        capabilities: {
          text: true,
          streaming: true,
          tools: true,
          vision,
          temperature: true,
        },
        ...(typeof entry.context_length === "number"
          ? { limits: { contextTokens: entry.context_length } }
          : {}),
        ...(inputPerMillion !== undefined || outputPerMillion !== undefined
          ? {
              pricing: {
                currency: "USD" as const,
                ...(inputPerMillion !== undefined ? { inputPerMillion } : {}),
                ...(outputPerMillion !== undefined ? { outputPerMillion } : {}),
                source: "openrouter-api",
              },
            }
          : {}),
        verification: { state: "inferred" as const },
      });
      if (models.length >= limit) {
        break;
      }
    }

    if (models.length === 0) {
      return {
        ok: false,
        baseURL,
        error: "OpenRouter returned an empty model catalog.",
      };
    }

    return { ok: true, models, baseURL };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = message.toLowerCase().includes("abort");
    return {
      ok: false,
      baseURL,
      error: aborted
        ? `Timed out contacting OpenRouter at ${baseURL}.`
        : `Could not reach OpenRouter at ${baseURL}: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prefer curated models that appear in discovery; always include an explicit
 * request id; fall back to full curated list when discovery failed.
 */
export function mergeOpenRouterCatalog(options: {
  discovered?: ProviderModel[] | undefined;
  requested?: string | undefined;
}): ProviderModel[] {
  const byId = new Map<string, ProviderModel>();

  if (options.discovered && options.discovered.length > 0) {
    const discoveredIds = new Set(options.discovered.map((m) => m.id));
    for (const curated of OPENROUTER_CURATED_MODELS) {
      if (discoveredIds.has(curated.id)) {
        const live = options.discovered.find((m) => m.id === curated.id);
        byId.set(curated.id, live ? { ...curated, ...pickLiveMeta(live) } : curated);
      }
    }
    // If none of the curated ids are live, keep a slice of discovery so /models is non-empty.
    if (byId.size === 0) {
      for (const model of options.discovered.slice(0, 20)) {
        byId.set(model.id, model);
      }
    }
  } else {
    for (const curated of OPENROUTER_CURATED_MODELS) {
      byId.set(curated.id, curated);
    }
  }

  if (options.requested?.trim()) {
    const id = options.requested.trim();
    if (!byId.has(id)) {
      const fromDiscovery = options.discovered?.find((m) => m.id === id);
      byId.set(id, fromDiscovery ?? openrouterModelFromId(id));
    }
  }

  return [...byId.values()];
}

function pickLiveMeta(live: ProviderModel): Partial<ProviderModel> {
  return {
    ...(live.limits ? { limits: live.limits } : {}),
    ...(live.pricing ? { pricing: live.pricing } : {}),
    ...(live.capabilities ? { capabilities: { ...live.capabilities } } : {}),
  };
}

/** OpenRouter prices are USD per token as strings; convert to per-1M. */
function parsePricePerTokenToMillion(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const perToken = Number.parseFloat(value);
  if (!Number.isFinite(perToken)) {
    return undefined;
  }
  return perToken * 1_000_000;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal) {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}
