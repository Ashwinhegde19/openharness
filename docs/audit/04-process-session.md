# Process and session flow

## Components

| Process | How started | Lifetime |
|---|---|---|
| CLI parent | user runs `togetherlink <harness>` | until harness exits |
| Daemon | CLI `ensureDaemon` spawns `--daemon` detached | outlives single session; shared |
| Harness child | `spawn(claude|codex|opencode|pi)` | session |
| Upstream | HTTPS to provider | per request |

## Daemon

- Host: **`127.0.0.1` only** (`CLAUDE_LOCAL_PROXY_HOST`)
- Default port: **7878** (`DEFAULT_DAEMON_PORT` / `TOGETHERLINK_PORT`)
- Health: `GET /healthz`
- Session register: `POST /internal/sessions` (body includes **apiKey**)
- Agent traffic: `/v1/*` authenticated with session/local bearer token
- PID file: `~/.togetherlink/` daemon pid path from `daemonPidPath()`

## Proxied session lifecycle (Claude / Codex)

From `proxied-session.ts`:

```text
resolve model
→ ensureDaemon
→ mint session id + local auth token
→ register session (apiKey + model + agent)
→ telemetry session_started
→ banner on stderr
→ spawn harness with proxy env/args
→ update pid on daemon
→ keepalive while running
→ await harness exit
→ print cost
→ deregister / mark ended
→ telemetry session_ended
→ optional cleanup (catalog files)
```

## Spawned session lifecycle (OpenCode / Pi)

```text
resolve key + model
→ build env or temp files
→ spawn binary (stdio inherit)
→ await exit
→ cleanup temp dirs (Pi)
→ set process.exitCode
```

No daemon, no CostTracker in daemon for OpenCode (self-report path exists conceptually in state comments; OpenCode harness currently does not register).

## Concurrent sessions

- Multiple proxied sessions share one daemon.
- Each has unique session token.
- Cleanup of one session must not kill daemon if others active (health checks session count before stop).

## Ownership / cleanup risks (for product RR-005)

| Risk | Current behavior | Product target |
|---|---|---|
| Kill by name | not primary path | must never |
| Stale PID file | cleared when probing | keep |
| Fixed port 7878 | not fully dynamic | prefer dynamic ports (RR-004) |
| SQLite restore after crash | restores active sessions **with api keys** | restore metadata only; secrets memory-only |
| Ctrl+C | harness exit → deregister path | verify on all OS |

## Session ID vs auth token

Historically the session token doubled as auth. Current code supports separate `authToken` on registration (`RegisterSessionRequest`). Both still persisted in SQLite when present.
