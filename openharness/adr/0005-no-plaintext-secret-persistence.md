# ADR-0005: Do Not Persist Active Session Secrets in Plaintext

- Status: Accepted for planning
- Date: 2026-07-15

## Context

The baseline persistence includes session credential fields. The new product should not leave active provider keys in databases or generated permanent config.

## Decision

Active provider keys and local proxy tokens remain in memory and are not written to persistent SQLite, JSON, TOML, logs, or harness configuration. Saved profiles store environment-variable references by default.

Persistent encrypted secret storage requires a separate ADR using an OS credential store or equivalent reviewed design.

## Consequences

Positive:

- smaller exposure window;
- backups contain no active keys;
- aligns with session scope;
- simpler security promise.

Negative:

- sessions cannot transparently resume after daemon restart;
- users manage environment variables or interactive entry;
- old schema migration requires care.

## Migration

- identify old secret fields;
- stop new writes;
- do not copy old keys into new schema;
- advise rotation where exposure is possible;
- add canary database tests.

## Review trigger

Any persistent secret storage proposal requires new threat modeling and ADR approval.
