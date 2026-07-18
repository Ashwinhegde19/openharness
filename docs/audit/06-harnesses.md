# Harness acceptance notes (baseline)

Public v1 product targets OpenCode, Claude Code, Codex. **Pi** exists in the fork but is not a public support claim until it passes product acceptance.

## Shared

| Item                  | Behavior                                                         |
| --------------------- | ---------------------------------------------------------------- |
| CLI shape             | harness-first: `openharness <harness> [flags] [passthrough…]`    |
| Model flag            | `--main` / `--model`                                             |
| Key flag              | `--api-key` (sets `apiKeyFromFlag`)                              |
| Detection             | `HARNESS_BIN` + `detect.ts`; missing binary → install hint, exit |
| Config mutation claim | ephemeral / process-scoped for OpenCode, Claude, Codex           |

## OpenCode

| Field                    | Value                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| Family                   | Spawned                                                                                                  |
| Binary                   | `opencode`                                                                                               |
| Isolation                | `OPENCODE_CONFIG_CONTENT` inline JSON + env key                                                          |
| Protocol                 | OpenAI-compatible via `@ai-sdk/togetherai` (direct to Together)                                          |
| Proxy                    | No                                                                                                       |
| Permanent config         | Should not write OpenCode config files                                                                   |
| Model override           | Strips user `--model` / `-m` so product controls model                                                   |
| Vision                   | `@vision` subagent on vision model; text-only primary issues documented                                  |
| Risks for multi-provider | Hard-coded Together npm adapter + provider id; need generic OpenAI-compatible path for Ollama/OpenRouter |

## Claude Code

| Field            | Value                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| Family           | Proxied                                                                              |
| Binary           | `claude`                                                                             |
| Isolation        | Process env only: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, model menu env       |
| Inbound protocol | Anthropic Messages `POST /v1/messages`                                               |
| Outbound         | Together Chat Completions                                                            |
| Proxy bind       | 127.0.0.1                                                                            |
| Permanent config | Does not write `~/.claude/settings.json`                                             |
| Extra            | Vision interception, compaction, context-fit, feedback survey disabled by default    |
| Risks            | Translation loss; Anthropic first-party endpoints may still be hit for some features |

## Codex CLI

| Field            | Value                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| Family           | Proxied                                                                            |
| Binary           | `codex`                                                                            |
| Isolation        | CLI `-c` config overrides + temp model catalog; auth via env key to proxy          |
| Inbound protocol | OpenAI Responses `POST /v1/responses`                                              |
| Outbound         | Chat Completions                                                                   |
| User config      | `ensureCodexGenericUserDefaults` may touch defaults unless ignore-user-config args |
| Risks            | Responses feature gap; verify config integrity tests for home files                |

## Pi Code

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Family         | Spawned                                                           |
| Binary         | `pi`                                                              |
| Isolation      | Temp agent dir + `models.json` **with secret** + argv `--api-key` |
| Protocol       | Provider "together" models file                                   |
| Public support | **Not claimed** in openharness v1 until hardened                  |
| Risks          | Secret on argv and disk; lowest priority for multi-provider       |

## codex-app (alpha)

ChatGPT Desktop integration exists (`codex-app.ts`). Orphan agent id in daemon vs `HarnessId`. Out of v1 product scope unless revisited.
