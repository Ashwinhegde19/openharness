import { describe, expect, test } from "vitest";
import { OPENCODE_DEFAULT_PROVIDER_ID } from "../../cli/src/lib/harnesses/opencode.js";
import {
  OLLAMA_PROVIDER_ID,
  OPENROUTER_API_KEY_ENV,
  OPENROUTER_PROVIDER_ID,
  TOGETHER_PROVIDER_ID,
  getBuiltinProvider,
  isBuiltinProviderId,
} from "../../cli/src/lib/provider/index.js";
import {
  OPENROUTER_API_KEY_ENV_REF,
  preferEnvRef,
  resolveStoredOpenRouterApiKey,
} from "../../cli/src/lib/global-config.js";
import { TOGETHER_API_KEY_ENV_REF } from "../../cli/src/lib/together-core.js";
import { parseArgs } from "../../cli/src/lib/parse-args.js";

describe("provider-scoped credentials (no Together product gate)", () => {
  test("OpenCode default provider is ollama (no API key)", () => {
    expect(OPENCODE_DEFAULT_PROVIDER_ID).toBe(OLLAMA_PROVIDER_ID);
    const ollama = getBuiltinProvider(OLLAMA_PROVIDER_ID);
    expect(ollama?.auth.type).toBe("none");
  });

  test("built-in providers remain selectable without a global Together key", () => {
    expect(isBuiltinProviderId("ollama")).toBe(true);
    expect(isBuiltinProviderId("openrouter")).toBe(true);
    expect(isBuiltinProviderId("together")).toBe(true);
    expect(getBuiltinProvider(OPENROUTER_PROVIDER_ID)?.auth).toMatchObject({
      type: "bearer",
      apiKeyEnv: OPENROUTER_API_KEY_ENV,
    });
    expect(getBuiltinProvider(TOGETHER_PROVIDER_ID)?.auth).toMatchObject({
      type: "bearer",
      apiKeyEnv: "TOGETHER_API_KEY",
    });
  });

  test("preferEnvRef stores env refs instead of literals when values match env", () => {
    const prev = process.env.TOGETHER_API_KEY;
    process.env.TOGETHER_API_KEY = "from-env";
    try {
      expect(preferEnvRef("from-env", "TOGETHER_API_KEY", TOGETHER_API_KEY_ENV_REF)).toBe(
        TOGETHER_API_KEY_ENV_REF,
      );
      expect(preferEnvRef("typed-literal", "TOGETHER_API_KEY", TOGETHER_API_KEY_ENV_REF)).toBe(
        "typed-literal",
      );
      expect(preferEnvRef("", "TOGETHER_API_KEY", TOGETHER_API_KEY_ENV_REF)).toBe("");
    } finally {
      if (prev === undefined) {
        delete process.env.TOGETHER_API_KEY;
      } else {
        process.env.TOGETHER_API_KEY = prev;
      }
    }
  });

  test("resolveStoredOpenRouterApiKey supports env refs", () => {
    const prev = process.env[OPENROUTER_API_KEY_ENV];
    process.env[OPENROUTER_API_KEY_ENV] = "or-from-env";
    try {
      expect(resolveStoredOpenRouterApiKey(OPENROUTER_API_KEY_ENV_REF)).toBe("or-from-env");
      expect(resolveStoredOpenRouterApiKey("literal-or-key")).toBe("literal-or-key");
      expect(resolveStoredOpenRouterApiKey("")).toBe("");
    } finally {
      if (prev === undefined) {
        delete process.env[OPENROUTER_API_KEY_ENV];
      } else {
        process.env[OPENROUTER_API_KEY_ENV] = prev;
      }
    }
  });

  test("CLI can select openrouter without a Together flag", () => {
    const parsed = parseArgs(["--provider", "openrouter", "opencode"]);
    expect(parsed.flags.provider).toBe("openrouter");
    expect(parsed.positional[0]).toBe("opencode");
    // Product no longer implies Together at the flag layer.
    expect(parsed.flags.apiKey).toBeUndefined();
  });
});
