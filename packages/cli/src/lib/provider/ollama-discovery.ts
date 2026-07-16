import { OLLAMA_DEFAULT_BASE_URL, ollamaModelFromId } from "./ollama-preset.js";
import type { ProviderModel } from "./types.js";

export type OllamaDiscoveryResult =
  | { ok: true; models: ProviderModel[]; baseURL: string }
  | { ok: false; error: string; baseURL: string };

type FetchLike = typeof fetch;

/**
 * Discover models from a local Ollama OpenAI-compatible `/v1/models` endpoint.
 * Falls back to native `/api/tags` when `/v1/models` is unavailable.
 */
export async function discoverOllamaModels(options?: {
  baseURL?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<OllamaDiscoveryResult> {
  const baseURL = (options?.baseURL ?? OLLAMA_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 3_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options?.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal;

  try {
    const openAi = await tryOpenAiModels(baseURL, fetchImpl, signal);
    if (openAi.ok && openAi.models.length > 0) {
      return { ok: true, models: openAi.models, baseURL };
    }

    const tags = await tryNativeTags(baseURL, fetchImpl, signal);
    if (tags.ok && tags.models.length > 0) {
      return { ok: true, models: tags.models, baseURL };
    }

    if (openAi.ok || tags.ok) {
      return {
        ok: false,
        baseURL,
        error:
          `Ollama is reachable at ${baseURL} but reported no models. ` +
          `Pull one with e.g. \`ollama pull llama3.2\`, then retry.`,
      };
    }

    return {
      ok: false,
      baseURL,
      error:
        `Could not reach Ollama at ${baseURL}. ` +
        `Is the daemon running? Try \`ollama serve\` or set --base-url.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = message.toLowerCase().includes("abort");
    return {
      ok: false,
      baseURL,
      error: aborted
        ? `Timed out contacting Ollama at ${baseURL}.`
        : `Could not reach Ollama at ${baseURL}: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function tryOpenAiModels(
  baseURL: string,
  fetchImpl: FetchLike,
  signal: AbortSignal,
): Promise<{ ok: boolean; models: ProviderModel[] }> {
  try {
    const response = await fetchImpl(`${baseURL}/models`, { method: "GET", signal });
    if (!response.ok) {
      return { ok: false, models: [] };
    }
    const json = (await response.json()) as {
      data?: Array<{ id?: string; name?: string }>;
    };
    const models = (json.data ?? [])
      .map((entry) => {
        const id = entry.id ?? entry.name;
        return typeof id === "string" && id.trim() ? ollamaModelFromId(id) : undefined;
      })
      .filter((m): m is ProviderModel => m !== undefined);
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  }
}

async function tryNativeTags(
  baseURL: string,
  fetchImpl: FetchLike,
  signal: AbortSignal,
): Promise<{ ok: boolean; models: ProviderModel[] }> {
  // /v1 -> host root for /api/tags
  const root = baseURL.replace(/\/v1\/?$/, "");
  try {
    const response = await fetchImpl(`${root}/api/tags`, { method: "GET", signal });
    if (!response.ok) {
      return { ok: false, models: [] };
    }
    const json = (await response.json()) as {
      models?: Array<{ name?: string; model?: string }>;
    };
    const models = (json.models ?? [])
      .map((entry) => {
        const id = entry.name ?? entry.model;
        return typeof id === "string" && id.trim() ? ollamaModelFromId(id) : undefined;
      })
      .filter((m): m is ProviderModel => m !== undefined);
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  }
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
