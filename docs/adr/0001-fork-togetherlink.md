# ADR-0001: Use TogetherLink as the Implementation Baseline

- Status: Accepted for planning
- Date: 2026-07-15

## Context

The product requires harness-specific launch behavior, local protocol proxies, streaming translation, tool conversion, session lifecycle, and cleanup. TogetherLink already implements important parts for OpenCode, Claude Code, Codex, and Pi while targeting Together AI.

Starting empty would require rebuilding these difficult paths before validating provider neutrality.

## Decision

Fork TogetherLink and preserve an upstream Git remote. Keep license and attribution obligations. Do not begin with a broad rename. Introduce provider-neutral abstractions while Together remains the regression baseline.

## Consequences

Positive:

- lower implementation risk;
- reusable protocol and lifecycle code;
- easier regression proof;
- existing harness paths.

Negative:

- Together-specific assumptions require careful audit;
- inherited persistence may conflict with new security requirements;
- upstream merges become harder after divergence;
- inherited dependencies and bugs require review.

## Alternatives

- Start from scratch: rejected due to duplicated risk.
- Use only a generic gateway: rejected because it does not solve safe harness launch.
- Extend a permanent config manager: rejected because it conflicts with the non-mutation promise.

## Review trigger

Revisit if generalizing the fork becomes more expensive than a bounded reimplementation or if licensing changes.
