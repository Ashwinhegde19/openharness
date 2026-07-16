# Universal Harness Provider Layer

> Working title. The final product name is intentionally undecided.

Session-scoped compatibility launcher that connects supported coding harnesses to supported model providers without permanently modifying the harnesses' normal configuration.

## Document status

- Status: Planning baseline + imported implementation
- Version: 0.1
- Last updated: 2026-07-16
- Implementation baseline: TogetherLink (see [docs/UPSTREAM.md](docs/UPSTREAM.md))
- Code layout: monorepo `packages/` at repository root
- Code status: Baseline imported; provider-neutral refactor not started (M0 complete)

## Documentation

All product planning, ADRs, diagrams, and audit notes live under [`docs/`](docs/).

### Reading order

1. [docs/PRODUCT.md](docs/PRODUCT.md) — problem, users, scope, non-goals, success criteria
2. [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — normative functional, security, reliability requirements
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, protocols, sessions, migration
4. [docs/SECURITY.md](docs/SECURITY.md) — threat model, credentials, proxy safety
5. [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) — levels, evidence, acceptance checklists
6. [docs/TEST-STRATEGY.md](docs/TEST-STRATEGY.md) — unit, protocol, harness, security tests
7. [docs/RELEASE-PLAN.md](docs/RELEASE-PLAN.md) — alpha → stable gates
8. [docs/ROADMAP.md](docs/ROADMAP.md) — milestones M0–M9
9. [docs/GLOSSARY.md](docs/GLOSSARY.md) — shared terminology
10. [docs/REPOSITORY-AUDIT.md](docs/REPOSITORY-AUDIT.md) — audit procedure
11. [docs/audit/](docs/audit/README.md) — **M0 deliverables** and M1 backlog

### Diagrams

- [System context](docs/diagrams/system-context.md)
- [Claude Code sequence](docs/diagrams/claude-sequence.md)
- [Codex sequence](docs/diagrams/codex-sequence.md)
- [OpenCode sequence](docs/diagrams/opencode-sequence.md)
- [Session lifecycle](docs/diagrams/session-lifecycle.md)

### Architecture decision records

- [ADR-0001: Fork TogetherLink](docs/adr/0001-fork-togetherlink.md)
- [ADR-0002: Provider-scoped models](docs/adr/0002-canonical-provider-model.md)
- [ADR-0003: Session-only configuration](docs/adr/0003-session-only-configuration.md)
- [ADR-0004: Local protocol proxy](docs/adr/0004-local-proxy-design.md)
- [ADR-0005: No plaintext secret persistence](docs/adr/0005-no-plaintext-secret-persistence.md)
- [ADR-0006: Capability-based compatibility](docs/adr/0006-capability-based-compatibility.md)

### Upstream baseline

- [docs/UPSTREAM.md](docs/UPSTREAM.md) — pinned commit and remotes
- [docs/UPSTREAM-TOGETHERLINK-README.md](docs/UPSTREAM-TOGETHERLINK-README.md) — original TogetherLink install/dev README
- [TESTING.md](TESTING.md) — upstream test guide (CLI)

## Codebase

```text
packages/cli      CLI, harness adapters, daemon, protocol proxies
packages/models   Model catalog (Together preset today)
packages/tests    Vitest suite
site/             Upstream install site / telemetry (optional for core work)
docs/             Product docs, ADRs, diagrams, M0 audit
```

```bash
pnpm install
pnpm -F @togetherlink/cli build
pnpm test
```

## Core product promise

> Run a supported model provider through a supported coding harness for an isolated session while preserving the user's normal harness configuration.

Compatibility is measured and published by capability level — not claimed for every combination.

## Git remotes

```text
origin    https://github.com/Ashwinhegde19/openharness.git   # your product repo (push here)
upstream  https://github.com/Nutlope/togetherlink.git        # fetch-only baseline
```

## Documentation rules

The words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

A pull request that changes launch behavior, provider routing, credential handling, persistence, configuration access, protocol translation, or support claims must update the relevant documents and tests in the same change.
