import { describe, expect, test, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { collectDoctorReport } from "../../cli/src/lib/diagnostics/doctor.js";

function tmpHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tl-doctor-"));
}

function fakeFetchOllamaOk(): typeof fetch {
  return vi.fn(async (url: string) => {
    if (url.endsWith("/api/tags")) {
      return new Response(JSON.stringify({ models: [{ name: "llama3.2:latest" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }) as unknown as typeof fetch;
}

describe("doctor diagnostics (M7)", () => {
  test("reports harness + provider checks and a recommendation", async () => {
    const report = await collectDoctorReport({ home: tmpHome(), fetchImpl: fakeFetchOllamaOk() });
    expect(report.product).toBe("openharness");
    expect(report.version).toBeTruthy();
    expect(report.platform).toBeTruthy();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(report.checks.some((c) => c.id === "provider:ollama" && c.severity === "ok")).toBe(true);
    expect(report.checks.some((c) => c.id.startsWith("harness:"))).toBe(true);
    expect(report.checks.some((c) => c.id === "product:no-global-key")).toBe(true);
    expect(report.recommendation).toBeTruthy();
  });

  test("flags Ollama as unreachable without throwing", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const report = await collectDoctorReport({ home: tmpHome(), fetchImpl });
    const ollama = report.checks.find((c) => c.id === "provider:ollama");
    expect(ollama?.severity).toBe("warn");
    expect(ollama?.fix).toBeTruthy();
  });

  test("detects a Together key from the environment", async () => {
    const prev = process.env.TOGETHER_API_KEY;
    process.env.TOGETHER_API_KEY = "tk-test-secret";
    try {
      const report = await collectDoctorReport({ home: tmpHome(), fetchImpl: fakeFetchOllamaOk() });
      const together = report.checks.find((c) => c.id === "provider:together");
      expect(together?.severity).toBe("ok");
    } finally {
      if (prev === undefined) {
        delete process.env.TOGETHER_API_KEY;
      } else {
        process.env.TOGETHER_API_KEY = prev;
      }
    }
  });

  test("does not expose key values in the report", async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "sk-or-super-secret";
    try {
      const report = await collectDoctorReport({ home: tmpHome(), fetchImpl: fakeFetchOllamaOk() });
      expect(JSON.stringify(report)).not.toContain("sk-or-super-secret");
    } finally {
      if (prev === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = prev;
      }
    }
  });
});
