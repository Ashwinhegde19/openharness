import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RegisterSessionRequest } from "./state.js";
import { togetherlinkHome } from "../paths.js";
import { withoutPersistedSecrets } from "./storage.js";
import { resolveTogetherApiKey } from "../together-core.js";

const REGISTRATION_FILE = "registration.json";

/**
 * Persisted daemon registration for the codex-app integration.
 *
 * `togetherlink codex-app` configures the Codex desktop app once and exits, so
 * unlike the CLI launchers there is no long-lived process to re-register the
 * session when the daemon loses it (restart, idle reap, kill -9). The Codex
 * app keeps sending its stable token and gets 401s until the user re-runs
 * `togetherlink codex-app`. Persisting the non-secret register body lets the
 * daemon rebuild the session on demand; the provider API key is re-resolved
 * from the environment / global config at read time (M2 — no plaintext keys).
 */
export function appRegistrationPath(home = togetherlinkHome()): string {
  return path.join(home, "codex-app", REGISTRATION_FILE);
}

export async function writeAppRegistration(
  registration: RegisterSessionRequest,
  home = togetherlinkHome(),
): Promise<void> {
  const file = appRegistrationPath(home);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  // M2: never write the active provider API key. Local session token remains
  // so the daemon can match the Codex app's stable Bearer token; mode 0600
  // still applies because the file is product-owned session metadata.
  const redacted = withoutPersistedSecrets(registration);
  await writeFile(tmp, `${JSON.stringify(redacted, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(tmp, file);
}

export async function clearAppRegistration(home = togetherlinkHome()): Promise<void> {
  await rm(appRegistrationPath(home), { force: true });
}

/**
 * Read the persisted registration, re-resolve the provider API key from env /
 * global config, and validate the same fields the daemon's register endpoint
 * requires for a proxied agent. Missing/malformed files or unresolvable keys
 * return undefined; the next `togetherlink codex-app` run rewrites the file.
 */
export async function readAppRegistration(
  home = togetherlinkHome(),
): Promise<RegisterSessionRequest | undefined> {
  let raw: string;
  try {
    raw = await readFile(appRegistrationPath(home), "utf8");
  } catch {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as RegisterSessionRequest;
    // Prefer an in-file key only for legacy pre-M2 files; new writes store "".
    const resolvedKey =
      (typeof parsed.apiKey === "string" && parsed.apiKey.trim()
        ? parsed.apiKey.trim()
        : "") || (await resolveTogetherApiKey({ home }));
    const candidate: RegisterSessionRequest = {
      ...parsed,
      apiKey: resolvedKey,
    };
    const valid =
      typeof candidate.token === "string" &&
      candidate.token !== "" &&
      typeof candidate.apiKey === "string" &&
      candidate.apiKey !== "" &&
      typeof candidate.modelLabel === "string" &&
      candidate.modelLabel !== "" &&
      typeof candidate.modelDefinition === "object" &&
      candidate.modelDefinition !== null &&
      typeof candidate.modelId === "string" &&
      candidate.modelId !== "" &&
      typeof candidate.targetModelId === "string" &&
      candidate.targetModelId !== "";
    if (valid) {
      return candidate;
    }
  } catch {
    // Malformed JSON: treat as absent.
  }
  return undefined;
}
