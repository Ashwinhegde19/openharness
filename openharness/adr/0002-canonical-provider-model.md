# ADR-0002: Use Provider-Scoped Provider and Model Records

- Status: Accepted for planning
- Date: 2026-07-15

## Context

The baseline has Together-specific endpoints, auth, models, prices, aliases, and limits. The same model can differ by provider in ID, price, context, tools, and behavior.

## Decision

Define typed ProviderConfig, ProviderAuth, ProviderModel, and ProviderCompatibilityPolicy records. Model records are scoped to a provider. Unknown values remain unknown. Harness adapters consume a resolved LaunchContext and do not own provider catalogs.

## Consequences

Positive:

- providers can be added without editing every harness;
- provider-specific behavior is accurate;
- prices and limits are not incorrectly shared;
- compatibility becomes data-driven.

Negative:

- duplicate underlying models across catalogs;
- aliases/discovery require normalization;
- exact provider IDs remain visible to users.

## Alternatives

- One global model catalog: rejected because it hides provider differences.
- Provider logic inside each harness: rejected because it recreates N x M integrations.

## Review trigger

Revisit if native protocols require a richer capability graph.
