# Persistence classification

Home root: `TOGETHERLINK_HOME` or `~/.togetherlink`.

## Classification legend

- **S** secret  
- **P** sensitive (private non-secret)  
- **N** non-sensitive  
- **I** integrity-critical  

## Files and stores

| Asset | Class | Notes |
|---|---|---|
| `config.json` → `apiKey` | **S** if literal; N if `{env:…}` only | Prefer env reference only |
| `config.json` → `exaApiKey` | **S** / N same pattern | Optional |
| `daemon.sqlite` → `api_key` | **S** | **Must remove for M2** |
| `daemon.sqlite` → `auth_token` | **S** | **Must remove for M2** |
| `daemon.sqlite` → model ids, usage, pid, timestamps | N / P | OK to keep |
| `daemon.sqlite` → `model_definition_json` | N | Includes public pricing |
| local-proxy-token file | **S** | Session-scoped; restrict perms |
| `install-id` | N | Telemetry |
| `bin/togetherlink.js` | N | Install artifact |
| codex-app registration / session lock | P | Paths under home |
| temp `togetherlink-codex-catalog-*` | N | Model catalog only |
| temp `togetherlink-pi-*` / `models.json` | **S** | Contains apiKey today |
| OpenCode user config | N | Product claims no permanent write |
| Claude `~/.claude/settings.json` | N | Not written by product |
| Codex user config | P | May ensure generic defaults (`user-config.ts`) — review for mutation |

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

## M2 migration sketch

1. Stop writing `api_key` / `auth_token` columns (or write empty + refuse restore of secrets).
2. Keep in-memory `SessionState` secrets only.
3. On daemon restart: active proxied sessions cannot resume auth; mark stale and clean ports/pids safely.
4. Canary tests scan DB after session for secret absence.
5. Document rotation if users ran versions that persisted keys.

## Logging defaults

Default logs should exclude prompts and keys. Debug paths exist (`TOGETHERLINK_DEBUG`). Canary redaction tests are required by product SECURITY.md and should be added if missing.
