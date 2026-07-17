import { afterEach, describe, expect, test, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { buildLaunchPlan } from "../../cli/src/lib/diagnostics/launch-plan.js";

function tmpHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tl-dryrun-"));
}

const fakeOllamaFetch: typeof fetch = vi.fn(async (url: string) => {
  if (url.endsWith("/api/tags")) {
    return new Response(JSON.stringify({ models: [{ name: "llama3.2:latest" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ data: [] }), { status: 200 });
}) as unknown as typeof fetch;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dry-run launch plan (M7)", () => {
  test("renders an OpenCode+Ollama plan without a key", async () => {
    vi.stubGlobal("fetch", fakeOllamaFetch);
    const plan = await buildLaunchPlan("opencode", {
      home: tmpHome(),
      provider: "ollama",
      main: "llama3.2",
      passthrough: [],
    });
    expect(plan.harness).toBe("opencode");
    expect(plan.family).toBe("spawned");
    expect(plan.provider).toBe("ollama");
    expect(plan.model).toBe("llama3.2");
    expect(plan.cloudDestination).toBe(false);
    expect(plan.auth.type).toBe("none");
    expect(plan.auth.keyPresent).toBe(true);
    expect(plan.sessionOnly).toBe(true);
    expect(plan.configPreview).toBeTruthy();
    expect(plan.errors.length).toBe(0);
    // Config preview is redacted — the provider apiKey is an env ref, not a secret.
    expect(JSON.stringify(plan.configPreview)).not.toMatch(/sk-|[A-Za-z0-9]{32}/);
  });

  test("renders cloud destination for OpenRouter without a key (preview)", async () => {
    vi.stubGlobal("fetch", fakeOllamaFetch);
    const plan = await buildLaunchPlan("opencode", {
      home: tmpHome(),
      provider: "openrouter",
      main: "openai/gpt-4o-mini",
      passthrough: [],
    });
    expect(plan.provider).toBe("openrouter");
    expect(plan.cloudDestination).toBe(true);
    expect(plan.auth.type).toBe("bearer");
    expect(plan.auth.required).toBe(true);
    expect(plan.auth.keyPresent).toBe(false);
    // Missing key is a preview warning, not a hard error.
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.errors.length).toBe(0);
  });

  test("flags an unknown harness as an error", async () => {
    const plan = await buildLaunchPlan("nope", { home: tmpHome(), passthrough: [] });
    expect(plan.errors.length).toBeGreaterThan(0);
  });

  test("renders a proxied plan for Claude on Ollama", async () => {
    const plan = await buildLaunchPlan("claude", {
      home: tmpHome(),
      provider: "ollama",
      passthrough: [],
    });
    expect(plan.family).toBe("proxied");
    expect(plan.provider).toBe("ollama");
    expect(plan.auth.type).toBe("none");
    expect(plan.sessionOnly).toBe(true);
    expect(plan.notes.some((n) => /session-scoped/i.test(n))).toBe(true);
  });

  test("does not expose key values in the printed plan", async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "sk-or-super-secret";
    try {
      const plan = await buildLaunchPlan("claude", {
        home: tmpHome(),
        provider: "openrouter",
        main: "openai/gpt-4o-mini",
        passthrough: [],
      });
      expect(JSON.stringify(plan)).not.toContain("sk-or-super-secret");
    } finally {
      if (prev === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = prev;
      }
    }
  });
});
