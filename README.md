# Universal Harness Provider Layer

> The repository and installed CLI binary are `openharness` — a provider-neutral fork of [TogetherLink](https://github.com/Nutlope/togetherlink).

Session-scoped compatibility launcher that connects supported coding harnesses to supported model providers without permanently modifying the harnesses' normal configuration.

## Document status

- Status: Provider-neutral fork (rebranded to openharness), M7 public alpha in progress
- Version: 0.1.0-alpha.1
- Last updated: 2026-07-17
- Implementation baseline: TogetherLink (see [docs/UPSTREAM.md](docs/UPSTREAM.md))
- Code layout: monorepo `packages/` at repository root
- Code status: **M0–M6 done**; **M7 (public alpha) in progress** — see [docs/STATUS.md](docs/STATUS.md)

## Documentation

All product planning, ADRs, diagrams, and audit notes live under [`docs/`](docs/).

### Status tracking

**[docs/STATUS.md](docs/STATUS.md)** — milestone checklist (what is done, open debt, harness×provider matrix). Update this when landing work.

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

- [ADR-0001: Fork TogetherLink](docs/adr/0001-fork-openharness.md)
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
pnpm -F @openharness/cli build
pnpm test
```

## Quick start (no API key required)

The lowest-friction first run uses **OpenCode + local Ollama** — no provider
account, no API key, and no permanent change to your OpenCode config.

```bash
# 1. Install a harness + a local model runtime
npm install -g opencode-ai@latest
ollama serve                 # start the local model server
ollama pull llama3.2         # fetch a model

# 2. Build and run this launcher
pnpm install
pnpm -F @openharness/cli build
node packages/cli/dist/bin/openharness.js opencode
```

Before launching, run `openharness doctor` to confirm the harness is on your
PATH and Ollama is reachable, and `openharness dry-run opencode` to preview the
exact (redacted) launch plan. Cloud providers (Together, OpenRouter) are opt-in
via `--provider` and only need a key when you select them.

## Core product promise

> Run a supported model provider through a supported coding harness for an isolated session while preserving the user's normal harness configuration.

**Together AI is not required.** It is one optional provider preset (still used by Claude/Codex/Pi until those paths are generalized). OpenCode defaults to local **Ollama** with no API key.

```bash
# Diagnose your setup (harnesses, Ollama reachability, optional keys)
openharness doctor

# Preview a launch plan without spawning anything (redacted)
openharness dry-run opencode --provider ollama --main llama3.2

# No cloud key — first run
openharness opencode                          # Ollama (default)
openharness opencode --provider ollama --main llama3.2

# Optional cloud providers
export OPENROUTER_API_KEY=...
openharness opencode --provider openrouter

export TOGETHER_API_KEY=...
openharness opencode --provider together
openharness claude                            # Together preset (default)
openharness claude --provider openrouter --main openai/gpt-4o-mini
openharness claude --provider ollama --main llama3.2
openharness codex --provider openrouter --main openai/gpt-4o-mini
openharness codex --provider ollama --main llama3.2
```

Compatibility is measured and published by capability level — not claimed for every combination.

## Git remotes

```text
origin    https://github.com/Ashwinhegde19/openharness.git   # your product repo (push here)
upstream  https://github.com/Nutlope/togetherlink.git        # fetch-only baseline
```

## Documentation rules

The words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

A pull request that changes launch behavior, provider routing, credential handling, persistence, configuration access, protocol translation, or support claims must update the relevant documents and tests in the same change.
