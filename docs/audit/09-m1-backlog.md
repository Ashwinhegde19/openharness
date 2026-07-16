# Prioritized M1 backlog

Goal: **Provider-neutral runtime with Together as a preset; zero behavior change for existing Together paths.**

Do **not** include in the first PR: branding rename, Ollama/OpenRouter presets, package moves, CLI redesign, protocol semantic rewrites.

## Issue order

### M1-01 — ProviderConfig / ProviderAuth / ProviderModel types
Introduce types from ARCHITECTURE.md in `packages/cli` (or small new module). Map existing Together catalog into `ProviderModel[]` without changing runtime yet.

**Req:** FR-002, FR-004, DR-001, DR-002, MR-002

### M1-02 — ProviderCompatibilityPolicy stub
Versioned policy object (strip fields, token limit field, stream usage). Together policy = current implicit behavior.

**Req:** FR-010, RR-007

### M1-03 — Parameterize together-client → upstream client
- Accept `baseURL`, `auth`, headers, query params
- Keep retry + context-fit
- Default preset = Together
- Preserve tests; mock server by base URL

**Req:** FR-007, RR-002, ARCH Phase B

### M1-04 — Thread Provider runtime through proxied session + daemon
Replace free-floating `apiKey` + implicit Together with `ProviderRuntime` on `RegisterSessionRequest` / `SessionState` / proxy options **without** multi-provider yet.

**Req:** ARCH Phase C

### M1-05 — OpenCode config generation data-driven
Build provider block from ProviderConfig (still Together preset). Keep `OPENCODE_CONFIG_CONTENT` non-mutating.

**Req:** FR-005, FR-006

### M1-06 — Claude/Codex proxy options take provider runtime
Proxy handlers call generic upstream client. Banners still say Together until rename phase.

### M1-07 — Regression gate
- Full `pnpm test` green
- Manual smoke optional with `TOGETHER_API_KEY`
- No new plaintext secret fields

### M2 (landed 2026-07-16)
- [x] Remove `api_key` / `auth_token` from SQLite writes + scrub legacy
- [x] Canary persistence tests (`secret-persistence.test.ts`)
- [x] Document daemon restart = no secret resume
- [ ] Prefer env-ref-only global config writes (partial — still allows literal in `configure`)

### M3+
- Ollama + OpenCode
- OpenRouter
- Claude/Codex through non-Together
- Branding rename last

## First PR definition of done

> Introduce provider-neutral runtime configuration and preserve current behavior through the Together provider preset.

Checklist:

- [x] Types + Together preset data — `packages/cli/src/lib/provider/`
- [x] Upstream client parameterized — `together-client.ts` accepts baseURL/auth/headers/queryParams
- [x] Daemon/session carry provider runtime — `RegisterSessionRequest.provider`, `SessionState.provider`, proxy options
- [x] Existing unit/proxy tests pass — plus `packages/tests/src/provider-runtime.test.ts`
- [x] Docs: note progress in ROADMAP / this audit
- [x] No package rename

## Explicit non-goals for first PR

- Changing CLI command names
- Removing Together branding strings
- Adding second provider
- Fixing Pi secret-on-argv (track under M2/Pi hardening)
- Site/telemetry rebrand

## Implementation notes (2026-07-16)

| Item | Location |
|---|---|
| ProviderConfig / Auth / Model / Runtime types | `packages/cli/src/lib/provider/types.ts` |
| Together preset + model mapping | `packages/cli/src/lib/provider/together-preset.ts` |
| Compatibility policy stub | `packages/cli/src/lib/provider/policy.ts` |
| Runtime helpers | `packages/cli/src/lib/provider/runtime.ts` |
| Parameterized client | `packages/cli/src/lib/together-client.ts` |
| Session threading | `daemon/state.ts`, `proxied-session.ts`, `codex-app.ts` |
| OpenCode data-driven provider block | `opencode/core.ts` (still Together preset) |
| Proxy options carry upstream fields | `claude/proxy.ts`, `codex/proxy.ts`, `claude/vision.ts` |

Together remains the default when `provider` is omitted (old launchers / restored sessions).
