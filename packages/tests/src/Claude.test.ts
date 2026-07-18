import { afterAll, beforeAll, describe, test } from "vitest";
import { cleanupTmpDir, createTestContext, resetTmpDir } from "./context.js";
import { claudeScenarios } from "./harnesses/claude.js";
import { LIVE_ENABLED } from "./live.js";
import type { TestContext } from "./types.js";

describe.skipIf(!LIVE_ENABLED)("Claude live headless gauntlet", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
    await resetTmpDir(context);
  });

  afterAll(async () => {
    await cleanupTmpDir(context);
  });

  for (const scenario of claudeScenarios()) {
    test(scenario.name, async () => {
      await scenario.run(context);
    });
  }
});
