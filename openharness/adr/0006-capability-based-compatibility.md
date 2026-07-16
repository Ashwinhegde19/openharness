# ADR-0006: Publish Capability-Based Compatibility

- Status: Accepted for planning
- Date: 2026-07-15

## Context

Providers implementing nominally similar APIs vary in fields, tools, streams, reasoning, vision, and errors. Models vary in reliable tool behavior. A binary works/does-not-work label is misleading.

## Decision

Use compatibility levels 0-5 and individual capability results for a specific product, OS, harness, provider, model, and policy tuple. Distinguish untested, inferred, tested, recommended, and regressed evidence.

## Consequences

Positive:

- honest expectations;
- easier diagnosis;
- incremental improvements can be represented;
- release claims map to tests.

Negative:

- ongoing matrix maintenance;
- more complexity than a provider list;
- model updates require re-testing.

## Alternatives

- Treat every compatible endpoint as supported: rejected.
- Publish provider-level support only: rejected because model and harness versions matter.

## Review trigger

Level labels may evolve after alpha evidence, but capability evidence remains required.
