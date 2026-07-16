import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import type { ModelDefinition } from "@togetherlink/models";
import {
  createSessionStore,
  PERSISTED_API_KEY_PLACEHOLDER,
  resolveSessionDatabasePath,
  SESSION_SCHEMA_VERSION,
  withoutPersistedSecrets,
  type SessionPersistInput,
} from "../../cli/src/lib/daemon/storage.js";
import {
  appRegistrationPath,
  readAppRegistration,
  writeAppRegistration,
} from "../../cli/src/lib/daemon/app-registration.js";
import type { RegisterSessionRequest } from "../../cli/src/lib/daemon/state.js";
import { SessionRegistry, buildSession } from "../../cli/src/lib/daemon/state.js";

const CANARY = "sk-canary-m2-secret-do-not-persist-9f3a2c1b";

const MODEL: ModelDefinition = {
  id: "zai-org/GLM-5.2",
  name: "GLM 5.2",
  anthropicAlias: "together-glm-5-2",
  cost: { input: 1.4, output: 4.4, cache_read: 0.26 },
  limit: { context: 262144, output: 164000 },
  attachment: false,
  reasoning: true,
  temperature: true,
  tool_call: true,
  modalities: { input: ["text"], output: ["text"] },
};

function sessionInput(token: string): SessionPersistInput {
  return {
    token,
    agent: "claude",
    apiKey: CANARY,
    authToken: `auth-${CANARY}`,
    modelLabel: MODEL.name,
    modelId: MODEL.anthropicAlias ?? MODEL.id,
    targetModelId: MODEL.id,
    modelName: MODEL.name,
    modelDefinition: MODEL,
    startedAt: Date.now(),
    lastSeenAt: Date.now(),
    costSummary: "[togetherlink cost] session total: $0.0000 (0 in, 0 out)",
    costTotals: { promptTokens: 0, cachedTokens: 0, completionTokens: 0, costUsd: 0 },
  };
}

function registration(homeKey = CANARY): RegisterSessionRequest {
  return {
    token: "togetherlink-local-canary-token",
    authToken: "togetherlink-local-canary-token",
    agent: "codex-app",
    apiKey: homeKey,
    modelLabel: `${MODEL.name} (Codex App alpha)`,
    modelId: MODEL.id,
    targetModelId: MODEL.id,
    modelName: MODEL.name,
    modelDefinition: MODEL,
  };
}

describe("withoutPersistedSecrets helper", () => {
  test("strips apiKey and authToken", () => {
    const redacted = withoutPersistedSecrets({
      token: "t",
      apiKey: CANARY,
      authToken: "auth-secret",
    });
    expect(redacted.apiKey).toBe(PERSISTED_API_KEY_PLACEHOLDER);
    expect(redacted.authToken).toBeUndefined();
    expect(JSON.stringify(redacted)).not.toContain(CANARY);
    expect(JSON.stringify(redacted)).not.toContain("auth-secret");
  });
});

describe("SQLite canary secret scan (M2)", () => {
  let home: string | undefined;

  afterEach(async () => {
    if (home) {
      await rm(home, { recursive: true, force: true });
      home = undefined;
    }
  });

  test("upsert never writes the canary API key or auth token to disk", async () => {
    home = await mkdtemp(path.join(tmpdir(), "togetherlink-m2-sqlite-"));
    const store = await createSessionStore(home);
    if (store.kind !== "sqlite") {
      // Environment without node:sqlite / bun:sqlite — redaction helper is the
      // contract we can still assert; full file scan runs where sqlite exists.
      expect(JSON.stringify(withoutPersistedSecrets(sessionInput("t")))).not.toContain(CANARY);
      store.close();
      return;
    }

    store.upsertSession(sessionInput("tok-canary"));
    const dbPath = resolveSessionDatabasePath(home);
    const raw = await readFile(dbPath);
    // Binary SQLite may embed strings as UTF-8 payloads.
    expect(Buffer.from(raw).includes(Buffer.from(CANARY, "utf8"))).toBe(false);
    expect(Buffer.from(raw).includes(Buffer.from(`auth-${CANARY}`, "utf8"))).toBe(false);

    const restored = store.restoreActiveSessions();
    expect(restored).toHaveLength(1);
    expect(restored[0]?.apiKey).toBe(PERSISTED_API_KEY_PLACEHOLDER);
    expect(restored[0]?.authToken).toBeUndefined();

    store.close();
  });

  test("migration scrubs legacy plaintext secrets from existing rows", async () => {
    home = await mkdtemp(path.join(tmpdir(), "togetherlink-m2-scrub-"));
    const store = await createSessionStore(home);
    if (store.kind !== "sqlite") {
      store.close();
      return;
    }
    store.close();

    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(resolveSessionDatabasePath(home));
    db.prepare(`
      INSERT INTO sessions (
        token, agent, started_at, model_label, api_key, auth_token,
        model_definition_json, prompt_tokens, cached_tokens, completion_tokens,
        cost_usd, cost_summary, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, '', ?)
    `).run(
      "legacy-tok",
      "claude",
      Date.now(),
      "GLM",
      CANARY,
      `auth-${CANARY}`,
      JSON.stringify(MODEL),
      Date.now(),
    );
    db.close();

    // Re-open store (runs migrate + scrub + VACUUM when secrets found).
    const reopened = await createSessionStore(home);
    const sessions = reopened.restoreActiveSessions();
    expect(sessions.some((s) => s.token === "legacy-tok")).toBe(true);
    expect(sessions.find((s) => s.token === "legacy-tok")?.apiKey).toBe(
      PERSISTED_API_KEY_PLACEHOLDER,
    );
    reopened.close();
    // Scan after close so WAL is flushed/checkpointed into the main file.
    const raw = await readFile(resolveSessionDatabasePath(home));
    expect(Buffer.from(raw).includes(Buffer.from(CANARY, "utf8"))).toBe(false);
  });

  test("schema user_version is stamped at M2 epoch", async () => {
    home = await mkdtemp(path.join(tmpdir(), "togetherlink-m2-ver-"));
    const store = await createSessionStore(home);
    if (store.kind !== "sqlite") {
      store.close();
      return;
    }
    store.close();
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(resolveSessionDatabasePath(home));
    const row = db.prepare("PRAGMA user_version").get() as
      | { user_version?: number }
      | number
      | undefined;
    const version =
      typeof row === "number"
        ? row
        : typeof row === "object" && row !== null
          ? (row.user_version ?? Object.values(row)[0])
          : undefined;
    expect(version).toBe(SESSION_SCHEMA_VERSION);
    db.close();
  });
});

describe("daemon restart seals sessions without rehydrating secrets (M2)", () => {
  test("restorePersisted ends active rows and returns zero live sessions", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "togetherlink-m2-restore-"));
    try {
      const store = await createSessionStore(home);
      store.upsertSession(sessionInput("live-1"));
      store.close();

      const reg = new SessionRegistry();
      // Point the registry store at our home by restoring with env override.
      const prev = process.env.TOGETHERLINK_HOME;
      process.env.TOGETHERLINK_HOME = home;
      try {
        // createSessionStore uses togetherlinkHome() which reads TOGETHERLINK_HOME
        // via paths — verify paths module.
        const { togetherlinkHome } = await import("../../cli/src/lib/paths.js");
        expect(togetherlinkHome()).toBe(home);
        const restored = await reg.restorePersisted();
        expect(restored).toBe(0);
        expect(reg.size).toBe(0);
      } finally {
        if (prev === undefined) {
          delete process.env.TOGETHERLINK_HOME;
        } else {
          process.env.TOGETHERLINK_HOME = prev;
        }
        reg.closeStore();
      }
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });

  test("in-memory session still holds the key after register", () => {
    const state = buildSession({
      token: "mem",
      agent: "claude",
      apiKey: CANARY,
      modelLabel: MODEL.name,
      modelId: MODEL.anthropicAlias ?? MODEL.id,
      targetModelId: MODEL.id,
      modelName: MODEL.name,
      modelDefinition: MODEL,
    });
    expect(state.apiKey).toBe(CANARY);
    expect(state.provider.apiKey).toBe(CANARY);
    expect(state.options?.apiKey).toBe(CANARY);
  });
});

describe("codex-app registration never stores the canary key (M2)", () => {
  let home: string | undefined;
  const prevKey = process.env.TOGETHER_API_KEY;

  afterEach(async () => {
    if (home) {
      await rm(home, { recursive: true, force: true });
      home = undefined;
    }
    if (prevKey === undefined) {
      delete process.env.TOGETHER_API_KEY;
    } else {
      process.env.TOGETHER_API_KEY = prevKey;
    }
  });

  test("on-disk registration JSON does not contain the canary; read rehydrates from env", async () => {
    home = await mkdtemp(path.join(tmpdir(), "togetherlink-m2-appreg-"));
    process.env.TOGETHER_API_KEY = CANARY;
    await writeAppRegistration(registration(CANARY), home);

    const raw = await readFile(appRegistrationPath(home), "utf8");
    expect(raw).not.toContain(CANARY);
    expect(JSON.parse(raw).apiKey).toBe(PERSISTED_API_KEY_PLACEHOLDER);

    const restored = await readAppRegistration(home);
    expect(restored?.apiKey).toBe(CANARY);
    expect(restored?.token).toBe("togetherlink-local-canary-token");
  });

  test("read returns undefined when the key cannot be re-resolved", async () => {
    home = await mkdtemp(path.join(tmpdir(), "togetherlink-m2-appreg-miss-"));
    delete process.env.TOGETHER_API_KEY;
    await writeAppRegistration(registration("ignored-will-be-redacted"), home);
    expect(await readAppRegistration(home)).toBeUndefined();
  });
});
