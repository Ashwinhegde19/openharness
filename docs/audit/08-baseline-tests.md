# Baseline test report

Date: 2026-07-16  
Pin: `9f56ed93b4b0d73d7a96bc70574851e21a46cdf7`  
Host: Linux developer machine  
Commands: `pnpm install && pnpm build && pnpm test`

## Build

| Step                               | Result                                          |
| ---------------------------------- | ----------------------------------------------- |
| `pnpm install`                     | Pass                                            |
| `pnpm build` (cli + models + site) | Pass                                            |
| CLI binary                         | `packages/cli/dist/bin/openharness.js` produced |

## Full suite (`pnpm test`)

| Metric        |                                                 Count |
| ------------- | ----------------------------------------------------: |
| Test files    |                                                    30 |
| Passed files  |                                                    23 |
| Failed files  |                                                     5 |
| Skipped files | 2 (`LiveSmoke`, `livemodelscheck` without live flags) |
| Passed tests  |                                                   204 |
| Failed tests  |                                                    18 |
| Skipped tests |                                                    47 |

### Failed files (environment / live)

These are **live headless gauntlets** that require installed harness CLIs and a real `TOGETHER_API_KEY`. They are not treated as M1 code regressions on this machine:

- `src/Claude.test.ts` (6) — needs `claude` + API key
- `src/Codex.test.ts` (6) — needs `codex` + API key
- `src/OpenCode.test.ts` (3) — needs `opencode` + API key
- `src/Pi.test.ts` (3) — needs `pi` + API key

Also:

- `src/daemon-session-auth.test.ts` — requires `TOGETHER_API_KEY` (or `.env`) to register sessions

Unhandled `EPIPE` noise appeared during live Claude/Codex long-context tests when child processes exited early.

### Intentionally skipped without flags

- `LiveSmoke.test.ts` — `OPENHARNESS_LIVE_SMOKE=1`
- `livemodelscheck.test.ts` — `OPENHARNESS_LIVE_MODELS_CHECK=1`

## Offline regression core (M1 gate)

Deterministic suite run without live harness binaries (API-mocked / unit):

Includes (representative):

- `ClaudeApi.test.ts`, `CodexProxyApi.test.ts`
- daemon state/registry/error-render/app-registration
- model-resolver, harness-invocation, command, context-fit, sse, paths
- proxy-utils, telemetry, token-estimator, vision
- claude-together-call, claude-context-budget
- codex-max-tokens, codex-user-config, codex-app-toml, codex-exec, codex-app

**Result on this host:** **23 files / 204 tests passed** when excluding key-gated `daemon-session-auth` and live gauntlets.

Use this offline set as the **M1 regression gate**. Re-enable live gauntlets in CI when secrets and harness binaries exist.

## Gaps vs product TEST-STRATEGY.md

| Product requirement        | Baseline today                        |
| -------------------------- | ------------------------------------- |
| Protocol contracts         | Strong Claude/Codex proxy API tests   |
| Config-integrity snapshots | Partial / not as formal product suite |
| Canary secret DB scan      | **Missing** — add in M2               |
| Crash cleanup / PID reuse  | Partial via daemon tests              |
| Cross-platform matrix      | Not run here (Linux only)             |
| Live multi-provider        | N/A (Together-only)                   |

## Recommendation

1. Document offline test command in CONTRIBUTING (later).
2. M1 CI: run offline core only.
3. Optional nightly: live gauntlet with secrets.
4. Before claiming M1 done: offline core green + no new secret persistence.
