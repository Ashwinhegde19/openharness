import { describe, expect, test } from "vitest";
import { openharnessHome, isProcessAlive } from "@openharness/cli/dist/lib/paths.js";

describe("paths.ts — single source of truth for home + liveness (#7)", () => {
  test("openharnessHome honors OPENHARNESS_HOME env", () => {
    const original = process.env.OPENHARNESS_HOME;
    process.env.OPENHARNESS_HOME = "/tmp/openharness-test-home-xyz";
    try {
      expect(openharnessHome()).toBe("/tmp/openharness-test-home-xyz");
    } finally {
      if (original === undefined) delete process.env.OPENHARNESS_HOME;
      else process.env.OPENHARNESS_HOME = original;
    }
  });

  test("openharnessHome falls back to ~/.openharness when env unset", () => {
    const original = process.env.OPENHARNESS_HOME;
    delete process.env.OPENHARNESS_HOME;
    try {
      const home = openharnessHome();
      expect(home.endsWith("/.openharness")).toBe(true);
    } finally {
      if (original !== undefined) process.env.OPENHARNESS_HOME = original;
    }
  });

  test("isProcessAlive returns false for a dead pid (ESRCH)", () => {
    // pid 0 is never a valid kill target on unix; use a very large unused pid.
    expect(isProcessAlive(999_999_999)).toBe(false);
  });

  test("isProcessAlive returns true for the current process", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });
});
