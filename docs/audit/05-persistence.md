# Persistence classification

Home root: `OPENHARNESS_HOME` or `~/.openharness`.

## Classification legend

- **S** secret
- **P** sensitive (private non-secret)
- **N** non-sensitive
- **I** integrity-critical

## Files and stores

| Asset                                               | Class                                 | Notes                                                                |
| --------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `config.json` → `apiKey`                            | **S** if literal; N if `{env:…}` only | Prefer env reference only                                            |
| `config.json` → `exaApiKey`                         | **S** / N same pattern                | Optional                                                             |
| `daemon.sqlite` → `api_key`                         | empty placeholder                     | **M2 done** — never writes real keys; legacy scrub + VACUUM          |
| `daemon.sqlite` → `auth_token`                      | always NULL                           | **M2 done** — never writes local proxy tokens                        |
| `daemon.sqlite` → model ids, usage, pid, timestamps | N / P                                 | OK to keep                                                           |
| `daemon.sqlite` → `model_definition_json`           | N                                     | Includes public pricing                                              |
| local-proxy-token file                              | **S**                                 | Session-scoped; restrict perms                                       |
| `install-id`                                        | N                                     | Telemetry                                                            |
| `bin/openharness.js`                                | N                                     | Install artifact                                                     |
| codex-app registration / session lock               | P (no API key)                        | **M2** redacts `apiKey`; rehydrates from env/global config on read   |
| temp `openharness-codex-catalog-*`                  | N                                     | Model catalog only                                                   |
| temp `openharness-pi-*` / `models.json`             | **S**                                 | Contains apiKey today                                                |
| OpenCode user config                                | N                                     | Product claims no permanent write                                    |
| Claude `~/.claude/settings.json`                    | N                                     | Not written by product                                               |
| Codex user config                                   | P                                     | May ensure generic defaults (`user-config.ts`) — review for mutation |

## SQLite schema (sessions)

```sql
token TEXT PRIMARY KEY,
agent TEXT NOT NULL,
pid INTEGER,
started_at INTEGER NOT NULL,
last_seen_at INTEGER,
ended_at INTEGER,
model_label TEXT NOT NULL,
api_key TEXT NOT NULL,          -- SECRET
auth_token TEXT,                 -- SECRET
model_id TEXT,
target_model_id TEXT,
model_name TEXT,
model_definition_json TEXT NOT NULL,
claude_code_max_output_tokens INTEGER,
claude_code_max_output_tokens_user_set INTEGER,
debug INTEGER,
prompt_tokens, cached_tokens, completion_tokens, cost_usd,
cost_summary, external_summary,
updated_at INTEGER NOT NULL
```

File mode: attempts `chmod 0o600` on DB.

## M2 migration (landed)

1. **Writes:** `api_key` always `""`, `auth_token` always `NULL` (`withoutPersistedSecrets` + `sessionParams`).
2. **Memory:** `SessionState.apiKey` / proxy options still hold the live key for the process lifetime only.
3. **Restart:** `SessionRegistry.restorePersisted` seals all active rows and returns `0` live sessions; stderr explains re-launch.
4. **Legacy DB:** on open, scrub any non-empty secret columns and `VACUUM` when secrets were found; `PRAGMA user_version = 2`.
5. **Canary:** `packages/tests/src/secret-persistence.test.ts`.
6. **Operators who ran pre-M2:** keys may have been on disk; M2 scrub clears columns on next daemon start. Rotate keys if the machine was untrusted while pre-M2 ran.

## Logging defaults

Default logs should exclude prompts and keys. Debug paths exist (`OPENHARNESS_DEBUG`). Canary redaction tests are required by product SECURITY.md and should be added if missing.
