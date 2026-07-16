# Protocol coverage table

Canonical upstream today: **OpenAI Chat Completions** at Together.

## Paths

| Harness inbound | Translation | Upstream | Modules |
|---|---|---|---|
| Anthropic Messages | Yes | Chat Completions | `claude/translate-request.ts`, `translate-response.ts`, `stream.ts`, `proxy.ts` |
| OpenAI Responses | Yes | Chat Completions | `codex/translate-request.ts`, `translate-response.ts`, `stream.ts`, `proxy.ts` |
| OpenAI Chat (OpenCode SDK) | Passthrough (SDK) | Chat Completions | OpenCode + `@ai-sdk/togetherai` |
| Pi provider file | n/a (direct) | Provider-defined | `harnesses/pi.ts` |

## Claude (Messages → Chat)

Covered in implementation / tests (high level):

| Area | Support level |
|---|---|
| System / user / assistant text | Implemented |
| Tool definitions / tool_use / tool_result | Implemented |
| Streaming text + tool args | Implemented (`claude/stream.ts` large) |
| Token counting endpoint | Stub/handler in proxy |
| Models list for Claude | Local synthetic `/v1/models` |
| Vision / images | Special path (`vision.ts`, failover) |
| Compaction | `compaction.ts` |
| Context length exceeded | Shared `context-fit.ts` retry |
| Errors | Anthropic-shaped via `together-call.ts` |

Likely lossy / limited:

- Perfect parity with Anthropic-only features
- Prompt caching semantics
- Some first-party Claude Code network calls that ignore `ANTHROPIC_BASE_URL`

## Codex (Responses → Chat)

| Area | Support level |
|---|---|
| Basic responses create | Implemented |
| Streaming events | Implemented (`codex/stream.ts`) |
| Tools | Implemented with mapping |
| Model catalog injection | Temp JSON |
| Errors | OpenAI-shaped (`writeOpenAIError`) |
| Idle / turn timeouts | Env-tunable |

Likely lossy / limited:

- Responses-only features without Chat equivalent (must fail closed per product rules)
- Reasoning item types may downgrade
- Exact event ordering edge cases — rely on `CodexProxyApi.test.ts`

## Shared upstream client

`postChatCompletion` / `postChatCompletionStream`:

- Retry 429/503 with backoff + Retry-After
- Optional context-fit mutation loop
- Hard-coded Together URL (M1: inject baseURL/auth/headers)

## Test anchors (do not delete in M1)

- `packages/tests/src/ClaudeApi.test.ts`
- `packages/tests/src/CodexProxyApi.test.ts`
- Fixtures under `packages/tests/fixtures/proxy/`
