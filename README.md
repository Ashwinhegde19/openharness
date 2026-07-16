# Universal Harness Provider Layer

> Working title. The final product name is intentionally undecided.

This repository contains the production planning documents for a session-scoped compatibility launcher that connects supported coding harnesses to supported model providers without permanently modifying the harnesses' normal configuration.

## Document status

- Status: Planning baseline
- Version: 0.1
- Last updated: 2026-07-15
- Implementation baseline: TogetherLink fork
- Code status: Planning only

## Reading order

1. [PRODUCT.md](PRODUCT.md) - product problem, users, scope, non-goals, success criteria.
2. [REQUIREMENTS.md](REQUIREMENTS.md) - normative functional, security, reliability, portability, and release requirements.
3. [ARCHITECTURE.md](ARCHITECTURE.md) - components, interfaces, data flow, protocol translation, sessions, and migration plan.
4. [SECURITY.md](SECURITY.md) - threat model, credential lifecycle, proxy safety, logging, and incident response.
5. [COMPATIBILITY.md](COMPATIBILITY.md) - compatibility levels, evidence model, and acceptance checklists.
6. [TEST-STRATEGY.md](TEST-STRATEGY.md) - unit, protocol, provider, harness, security, crash, and live testing.
7. [RELEASE-PLAN.md](RELEASE-PLAN.md) - alpha, beta, release candidate, stable gates, rollback, and support.
8. [ROADMAP.md](ROADMAP.md) - milestone sequence from audit to stable release.
9. [GLOSSARY.md](GLOSSARY.md) - shared terminology.
10. [REPOSITORY-AUDIT.md](REPOSITORY-AUDIT.md) - TogetherLink-specific audit baseline and required deliverables.

## Diagrams

- [System context](diagrams/system-context.md)
- [Claude Code request sequence](diagrams/claude-sequence.md)
- [Codex request sequence](diagrams/codex-sequence.md)
- [OpenCode request sequence](diagrams/opencode-sequence.md)
- [Session lifecycle and cleanup](diagrams/session-lifecycle.md)

## Architecture Decision Records

- [ADR-0001: Fork TogetherLink](adr/0001-fork-togetherlink.md)
- [ADR-0002: Provider-scoped model representation](adr/0002-canonical-provider-model.md)
- [ADR-0003: Session-scoped configuration](adr/0003-session-only-configuration.md)
- [ADR-0004: Local protocol proxy](adr/0004-local-proxy-design.md)
- [ADR-0005: No plaintext secret persistence](adr/0005-no-plaintext-secret-persistence.md)
- [ADR-0006: Capability-based compatibility](adr/0006-capability-based-compatibility.md)

## Core product promise

> Run a supported model provider through a supported coding harness for an isolated session while preserving the user's normal harness configuration.

The product must not claim that every provider, model, and harness combination is fully compatible. Compatibility is measured and published by capability level.

## Documentation rules

The words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative in REQUIREMENTS.md.

A pull request that changes launch behavior, provider routing, credential handling, persistence, configuration access, protocol translation, or support claims must update the relevant documents and tests in the same change.
