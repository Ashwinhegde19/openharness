# M0 Repository Audit

Status: **complete for baseline pin**  
Date: 2026-07-16  
Upstream pin: `9f56ed93b4b0d73d7a96bc70574851e21a46cdf7` (TogetherLink v0.5.26)  
See [../UPSTREAM.md](../UPSTREAM.md) (pinned TogetherLink commit).

## Deliverables

| # | Deliverable | Document |
|---|---|---|
| 1 | Exact upstream commit | [../UPSTREAM.md](../UPSTREAM.md) |
| 2 | Package / dependency map | [01-package-map.md](01-package-map.md) |
| 3 | Together reference inventory | [02-together-inventory.md](02-together-inventory.md) |
| 4 | Credential data flow | [03-credential-flow.md](03-credential-flow.md) |
| 5 | Process / session flow | [04-process-session.md](04-process-session.md) |
| 6 | Persistence classification | [05-persistence.md](05-persistence.md) |
| 7 | Harness acceptance notes | [06-harnesses.md](06-harnesses.md) |
| 8 | Protocol coverage | [07-protocol-coverage.md](07-protocol-coverage.md) |
| 9 | Baseline test report | [08-baseline-tests.md](08-baseline-tests.md) |
| 10 | Prioritized M1 issues | [09-m1-backlog.md](09-m1-backlog.md) |

## Exit criteria (M0)

- [x] Scope and non-goals already in PRODUCT.md / REQUIREMENTS.md
- [x] Upstream commit pinned
- [x] Credential and persistence assumptions mapped against real code
- [x] First implementation PR bounded (see 09-m1-backlog.md)

## M1 status

**Done** (provider-neutral Together baseline). Details and file map: [09-m1-backlog.md](09-m1-backlog.md). Next milestone: **M2** secret-safe runtime.

## Important confirmed findings

1. **SQLite persists plaintext `api_key` and `auth_token`** in `~/.togetherlink/daemon.sqlite` (`packages/cli/src/lib/daemon/storage.ts`). Conflicts with SR-001 / ADR-0005 — primary M2 work.
2. **Global config may store a literal API key** in `~/.togetherlink/config.json` (or `{env:TOGETHER_API_KEY}`).
3. **Upstream client is hard-coded** to `https://api.together.ai/v1` (`packages/models` + `together-client.ts`).
4. **Harness adapter split already exists** (claude / codex / opencode / pi) — preserve; do not invent N×M integrations.
5. **License mismatch**: `LICENSE` is MIT; `package.json` fields say Apache-2.0. Reconcile before public stable.
