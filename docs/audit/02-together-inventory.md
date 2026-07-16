# Together reference inventory

Classification of Together-specific coupling. **Do not bulk-rename** before provider-neutral architecture is stable.

**Product note:** Together is an **optional provider preset**, not a product identity. The CLI does not require `TOGETHER_API_KEY` to start or to run OpenCode+Ollama. Together keys are only needed for the Together preset paths (Claude/Codex/Pi today; OpenCode `--provider together`).

## A. Endpoint and auth (must become ProviderConfig)

| Location                                  | What                                                        | Class           |
| ----------------------------------------- | ----------------------------------------------------------- | --------------- |
| `packages/models/src/index.ts`            | `TOGETHER_BASE_URL = "https://api.together.ai/v1"`          | endpoint        |
| `packages/cli/src/lib/together-core.ts`   | re-exports base URL; `TOGETHER_API_KEY_ENV_REF`             | auth/env        |
| `packages/cli/src/lib/together-client.ts` | `fetch(\`${TOGETHER_BASE_URL}/chat/completions\`)` + Bearer | upstream client |
| `packages/cli/src/lib/global-config.ts`   | `apiKey` resolution via `TOGETHER_API_KEY`                  | auth            |
| `packages/cli/src/lib/commands/global.ts` | configure prompt for Together key                           | branding + auth |
| `packages/cli/src/lib/opencode/core.ts`   | `@ai-sdk/togetherai`, provider name "Together AI"           | provider preset |
| `packages/cli/src/lib/harnesses/*`        | error strings "No Together API key"                         | branding        |
| `packages/cli/src/lib/claude/vision.ts`   | uses `TOGETHER_BASE_URL` for vision calls                   | endpoint        |

## B. Model catalog and pricing (must become provider-scoped)

| Location                                    | What                                               | Class          |
| ------------------------------------------- | -------------------------------------------------- | -------------- |
| `packages/models/src/index.ts`              | GLM/Kimi/MiniMax/Qwen/DeepSeek defs, costs, limits | model metadata |
| `packages/cli/src/lib/claude/defaults.ts`   | Claude aliases → Together models                   | model mapping  |
| `packages/cli/src/lib/codex/defaults.ts`    | Codex model list from shared catalog               | model mapping  |
| `packages/cli/src/lib/opencode/defaults.ts` | OpenCode model entries / whitelist                 | model mapping  |
| `packages/cli/src/lib/cost.ts`              | Together pricing assumptions                       | pricing        |

## C. Branding / package identity (rename last — M6+)

| Location                               | What              |
| -------------------------------------- | ----------------- |
| package names `@togetherlink/*`        | npm identity      |
| bin `togetherlink`, aliases `tclaude`… | CLI names         |
| `~/.togetherlink` home                 | paths             |
| env `TOGETHERLINK_*`                   | env prefix        |
| site assets / install origin           | distribution      |
| banners "Routing … → Together AI"      | UX strings        |
| telemetry events                       | product analytics |

## D. Reusable protocol / lifecycle (keep; generalize inputs)

| Module                                    | Role                 | Together coupling today        |
| ----------------------------------------- | -------------------- | ------------------------------ |
| `claude/translate-*.ts`, `stream.ts`      | Anthropic ↔ Chat     | low (model ids/errors)         |
| `codex/translate-*.ts`, `stream.ts`       | Responses ↔ Chat     | low                            |
| `daemon/*`                                | proxy + sessions     | medium (stores Together key)   |
| `proxied-session.ts`                      | launch lifecycle     | medium (apiKey field)          |
| `context-fit.ts`                          | context-length retry | medium (Together error shapes) |
| `harness-types.ts`, `harness-registry.ts` | adapter pattern      | low                            |

## E. Environment variables (inventory)

### Provider / user secrets

- `TOGETHER_API_KEY`
- `EXA_API_KEY` (optional web search)

### Product control

- `TOGETHERLINK_HOME`
- `TOGETHERLINK_PORT` (default daemon **7878**)
- `TOGETHERLINK_DEBUG`, `TOGETHERLINK_DEBUG_LOG`, `TOGETHERLINK_PERF`
- `TOGETHERLINK_TELEMETRY_URL`, `TOGETHERLINK_MANIFEST_URL`, `TOGETHERLINK_VERSION`
- Stream tuning: `TOGETHERLINK_CODEX_STREAM_*`, `TOGETHERLINK_VISION_FAILOVER_RACE_DELAY_MS`
- Daemon TTL: `TOGETHERLINK_DAEMON_*`
- Live tests: `TOGETHERLINK_LIVE_SMOKE`, `TOGETHERLINK_LIVE_MODELS_CHECK`

## F. Approximate hit density

Highest `together` string density (source/docs, excluding lockfile):

- `together-client.ts`, `claude/stream.ts`, `codex/together-call.ts`
- `daemon/server.ts`, `opencode/core.ts`, `models/index.ts`
- tests: `CodexProxyApi.test.ts`, `ClaudeApi.test.ts`
- install/README/scripts

**Inventory rule for M1:** parameterize A + make B a Together _preset_; leave C alone.
