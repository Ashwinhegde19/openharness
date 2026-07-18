import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Live gauntlet tests need a real Together API key (and the harness binaries on
 * PATH). They are excluded from the offline CI job and only run when a key is
 * available. Resolve the key the same way the product does (env, then repo-root
 * .env) so local runs with a `.env` still execute the live suite.
 *
 * The result is computed synchronously at module load so it can drive
 * `describe.skipIf` — async resolution is not available there.
 */
function resolveLiveKey(): string {
  const envKey = process.env.TOGETHER_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (existsSync(envPath)) {
      const line = readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .find((entry) => entry.startsWith("TOGETHER_API_KEY="));
      const key = line?.slice("TOGETHER_API_KEY=".length).trim();
      if (key) {
        return key;
      }
    }
  } catch {
    // ignore — no key available
  }
  return "";
}

/** Whether the live gauntlet should run (a key is configured). */
export const LIVE_ENABLED = resolveLiveKey().length > 0;

/** The resolved live key, or undefined when live testing is disabled. */
export const LIVE_API_KEY = LIVE_ENABLED ? resolveLiveKey() : undefined;
