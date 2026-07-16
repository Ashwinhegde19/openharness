# ADR-0003: Prefer Session-Scoped, Non-Mutating Harness Configuration

- Status: Accepted for planning
- Date: 2026-07-15

## Context

The core user value is switching providers without breaking normal Claude Code, Codex, OpenCode, or other harness setup. Permanent synchronization creates conflict, restoration, and secret risks.

## Decision

Use this priority:

1. environment-only injection;
2. inline configuration;
3. shadow config/alternate home;
4. local proxy;
5. reversible temporary patch only as a last resort.

Every supported path documents persistent effects and has config-integrity tests.

## Consequences

Positive:

- lower risk to user setup;
- easy uninstall/rollback;
- safer experiments and benchmarks;
- clearer security boundary.

Negative:

- some harnesses may be impossible to support safely;
- shadow config may require selective copying;
- runtime launch logic is more complex.

## Alternatives

- Synchronize real configs: rejected as the default.
- Require manual gateway setup: rejected because it leaves the main user problem unsolved.

## Review trigger

Any persistent harness config modification requires a new or amended ADR.
