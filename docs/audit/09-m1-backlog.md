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

### M2 (next milestone, not M1)
- Remove `api_key` / `auth_token` from SQLite
- Prefer env-ref-only config writes
- Canary persistence tests
- Document daemon restart = no secret resume

### M3+
- Ollama + OpenCode
- OpenRouter
- Claude/Codex through non-Together
- Branding rename last

## First PR definition of done

> Introduce provider-neutral runtime configuration and preserve current behavior through the Together provider preset.

Checklist:

- [ ] Types + Together preset data
- [ ] Upstream client parameterized
- [ ] Daemon/session carry provider runtime
- [ ] Existing unit/proxy tests pass
- [ ] Docs: note progress in ROADMAP / this audit
- [ ] No package rename

## Explicit non-goals for first PR

- Changing CLI command names
- Removing Together branding strings
- Adding second provider
- Fixing Pi secret-on-argv (track under M2/Pi hardening)
- Site/telemetry rebrand
