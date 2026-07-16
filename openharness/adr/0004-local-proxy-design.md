# ADR-0004: Use a Loopback Protocol Translation Proxy When Required

- Status: Accepted for planning
- Date: 2026-07-15

## Context

Claude Code and Codex may emit protocols many open-source providers do not implement. Direct base-URL injection is insufficient.

## Decision

Use a session-scoped loopback proxy for required translations:

- Anthropic Messages to OpenAI Chat;
- OpenAI Responses to OpenAI Chat.

The proxy binds to loopback, uses session authentication where possible, receives provider credentials in memory, separates protocol and provider policy, streams promptly, and shuts down with the session.

## Consequences

Positive:

- enables incompatible protocol combinations;
- preserves harness config;
- centralizes translation tests.

Negative:

- translation can be lossy;
- adds port, security, and cleanup complexity;
- stream/tool mapping is difficult.

## Alternatives

- Modify harness source: rejected.
- Require every provider to implement every harness protocol: unrealistic.
- Permanent open gateway: rejected for version 1 due to larger attack surface.

## Review trigger

Revisit if harnesses adopt a common runtime protocol or direct override mechanism.
