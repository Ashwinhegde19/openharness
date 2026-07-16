import os from "node:os";
import path from "node:path";
import {
  readJsonIfExists,
  writeJsonAtomic,
  TOGETHER_API_KEY_ENV_REF,
  EXA_API_KEY_ENV_REF,
} from "./together-core.js";
import { OPENROUTER_API_KEY_ENV } from "./provider/openrouter-preset.js";

export const OPENROUTER_API_KEY_ENV_REF = `{env:${OPENROUTER_API_KEY_ENV}}`;

export type GlobalConfig = {
  /** Optional Together preset key (or `{env:TOGETHER_API_KEY}`). */
  apiKey: string;
  /** Optional OpenRouter preset key (or `{env:OPENROUTER_API_KEY}`). */
  openrouterApiKey: string;
  /** Optional Exa key for Claude web_search proxy. */
  exaApiKey: string;
};

export function togetherlinkHome(home = os.homedir()): string {
  return path.join(home, ".togetherlink");
}

function globalConfigPath(home = os.homedir()): string {
  return path.join(togetherlinkHome(home), "config.json");
}

export async function readGlobalConfig(home = os.homedir()): Promise<GlobalConfig> {
  const config = await readJsonIfExists<Partial<GlobalConfig>>(globalConfigPath(home));
  return {
    apiKey: config.apiKey ?? "",
    openrouterApiKey: config.openrouterApiKey ?? "",
    exaApiKey: config.exaApiKey ?? "",
  };
}

export async function writeGlobalConfig(home: string, config: GlobalConfig): Promise<void> {
  await writeJsonAtomic(globalConfigPath(home), config);
}

export async function setGlobalApiKey(home: string, apiKey: string): Promise<void> {
  const config = await readGlobalConfig(home);
  config.apiKey = apiKey;
  await writeGlobalConfig(home, config);
}

export async function setGlobalOpenRouterApiKey(
  home: string,
  openrouterApiKey: string,
): Promise<void> {
  const config = await readGlobalConfig(home);
  config.openrouterApiKey = openrouterApiKey;
  await writeGlobalConfig(home, config);
}

export async function setGlobalExaApiKey(home: string, exaApiKey: string): Promise<void> {
  const config = await readGlobalConfig(home);
  config.exaApiKey = exaApiKey;
  await writeGlobalConfig(home, config);
}

/**
 * Resolves a stored key value to the literal secret. Stored values are
 * either a literal key or the `{env:TOGETHER_API_KEY}` reference written
 * when the key came from the environment rather than `--api-key`.
 */
export function resolveStoredApiKey(stored: string | undefined): string {
  if (!stored) {
    return "";
  }
  if (stored === TOGETHER_API_KEY_ENV_REF) {
    return process.env.TOGETHER_API_KEY?.trim() ?? "";
  }
  return stored;
}

export function resolveStoredOpenRouterApiKey(stored: string | undefined): string {
  if (!stored) {
    return "";
  }
  if (stored === OPENROUTER_API_KEY_ENV_REF) {
    return process.env[OPENROUTER_API_KEY_ENV]?.trim() ?? "";
  }
  return stored;
}

/**
 * Resolves the stored Exa key to the literal secret. Supports the same
 * `{env:EXA_API_KEY}` reference pattern as the Together key, so a key that
 * came from the environment (e.g. the repo .env) isn't persisted as a literal.
 */
export function resolveStoredExaApiKey(stored: string | undefined): string {
  if (!stored) {
    return "";
  }
  if (stored === EXA_API_KEY_ENV_REF) {
    return process.env.EXA_API_KEY?.trim() ?? "";
  }
  return stored;
}

/** Prefer `{env:NAME}` when the resolved value matches the process environment. */
export function preferEnvRef(value: string, envName: string, envRef: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv && fromEnv === trimmed) {
    return envRef;
  }
  return trimmed;
}
