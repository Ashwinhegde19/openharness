# Normative Requirements

## 1. Purpose and terminology

This document specifies product and engineering requirements for the Universal Harness Provider Layer.

The words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative.

A **supported combination** is a specific tuple:

```text
product version
+ operating system
+ harness version
+ provider
+ provider protocol
+ model
+ compatibility-policy version
+ capability
```

Support is not implied merely because a provider exposes an endpoint described as OpenAI-compatible.

## 2. Functional requirements

### FR-001: Launch a supported harness

The system MUST launch a selected supported harness using a selected provider and model.

The system MUST preserve harness arguments after an explicit separator.

Canonical form:

```bash
product run <harness> [product options] -- [harness options]
```

### FR-002: Resolve provider configuration

The system MUST support provider configuration from:

1. a built-in preset;
2. a saved local provider profile;
3. inline launch arguments.

Resolution precedence MUST be:

```text
explicit launch arguments
> selected provider profile
> provider preset defaults
> product global defaults
```

The system MUST normalize the final provider configuration before starting the harness.

### FR-003: Resolve credentials

The system MUST support credentials through an environment-variable reference.

The system MAY support hidden interactive secret entry.

The system MUST NOT require users to place secret values in command-line arguments.

If direct CLI secret values are supported, the system MUST warn that shell history and process inspection may expose them.

### FR-004: Resolve models

The system MUST accept an exact provider model ID.

The system SHOULD support model discovery when the provider exposes a compatible model-list endpoint.

The system MUST allow manual model entry when discovery is unavailable, incomplete, malformed, or intentionally disabled.

The system MUST distinguish a display label from the exact provider model ID.

The system MUST NOT silently change the selected model.

### FR-005: Preserve permanent harness configuration

For a launch path documented as non-mutating, the product MUST NOT modify the harness's persistent configuration files.

The system MUST maintain automated integrity tests for known harness configuration locations.

Dry-run MUST state the expected persistent configuration effects.

### FR-006: Select an isolation strategy

The product MUST choose one of the following strategies:

1. environment-only injection;
2. inline configuration;
3. shadow home or temporary configuration directory;
4. local protocol proxy;
5. reversible temporary patch.

The product SHOULD prefer the earliest safe strategy in the list.

A reversible temporary patch MUST be used only when no non-mutating strategy can support the harness and the path has a documented conflict-safe restoration design.

### FR-007: Protocol translation

The system MUST support the version 1 translation paths:

- Anthropic Messages to OpenAI Chat Completions for Claude Code when direct compatibility is unavailable;
- OpenAI Responses to OpenAI Chat Completions for Codex when the provider lacks Responses support;
- OpenAI Chat passthrough for clients already using the canonical upstream protocol.

The system MUST preserve request correlation across translated streams.

The system MUST fail explicitly when an essential requested feature cannot be represented safely in the outbound protocol.

### FR-008: Streaming

The system MUST support streaming for combinations published at compatibility level 2 or higher.

The system MUST terminate a stream correctly after:

- provider completion;
- harness/client cancellation;
- provider error;
- malformed stream;
- proxy shutdown;
- timeout.

The system MUST NOT emit malformed partial tool-call events to the harness.

### FR-009: Tool calls

The system MUST support standard single tool calls for combinations published at compatibility level 3 or higher.

The system SHOULD support parallel tool calls only after both translation and provider paths pass the parallel-tool contract suite.

If the model or provider lacks reliable tool support, the system MUST warn or block according to harness requirements and non-interactive policy.

### FR-010: Provider normalization

The system MUST support provider-specific request normalization through versioned, data-driven compatibility policies.

Policies MAY:

- remove unsupported fields;
- rename fields;
- constrain field values;
- select endpoint paths;
- add required headers;
- normalize token-limit fields;
- normalize streaming usage behavior.

Policies MUST NOT silently substitute providers or models.

### FR-011: Custom headers and query parameters

The system MUST support configured custom headers and query parameters.

The system MUST validate header names and reject CR/LF injection.

The system MUST reserve or control headers whose modification could break HTTP integrity, including Host and Content-Length.

Headers designated as secret MUST be redacted.

### FR-012: Local no-auth providers

The system MUST support providers requiring no API key.

The system SHOULD warn when a no-auth endpoint is not loopback or an explicitly trusted private endpoint.

### FR-013: Provider probing

The system MAY probe provider compatibility.

A probe that sends an inference request MUST be explicit because it may consume tokens or incur cost.

Probe content MUST be synthetic and MUST NOT contain user source code.

Probe results MUST be described as evidence for the exact endpoint and model tested, not universal provider proof.

### FR-014: Session management

Each launch MUST have a unique, unpredictable session ID.

The session manager MUST track product-owned:

- process handles or ownership evidence;
- listeners and ports;
- temporary directories and files;
- proxy state;
- cleanup state.

The session manager MUST NOT terminate a process it cannot prove belongs to the session.

### FR-015: Cleanup

On normal exit, the product MUST:

- stop product-owned proxies;
- cancel product-owned upstream requests;
- release product-owned listeners;
- remove secret-bearing temporary files;
- remove product-owned empty temporary directories;
- clear in-memory credential references where practical;
- report incomplete cleanup.

On abnormal exit, the product MUST provide a deterministic cleanup command.

Cleanup MUST be idempotent.

### FR-016: Doctor command

The product MUST provide a doctor command that can verify:

- harness installation;
- harness version;
- resolved executable path;
- provider URL syntax;
- credential availability;
- local port availability;
- temporary-directory permissions;
- provider connectivity;
- model availability when discoverable;
- known compatibility warnings;
- stale product-owned sessions.

Doctor MUST NOT print secret values.

### FR-017: Dry-run command

Dry-run MUST NOT start the harness or send a provider inference request.

Dry-run MUST display:

- resolved harness executable;
- harness version when detected;
- provider label and destination URL;
- selected model ID;
- inbound and outbound protocols;
- isolation strategy;
- environment variable names to be set, with secret values redacted;
- temporary resources expected;
- proxy binding when applicable;
- compatibility level;
- warnings and blockers;
- expected persistent effects.

### FR-018: Configuration diff verification

The product SHOULD provide an optional verification mode that snapshots known harness config paths before launch and compares them after exit.

Verification SHOULD record:

- file path and type;
- content hash;
- permissions where supported;
- symlink target;
- selected metadata.

The output MUST distinguish product-owned changes, harness-owned changes, concurrent user changes, and unreadable paths where possible.

### FR-019: Compatibility reporting

The product MUST publish compatibility by product version, operating system, harness version, provider, model, and capability.

The product MUST use the levels and verification states defined in COMPATIBILITY.md.

The product MUST distinguish tested evidence from inferred compatibility.

### FR-020: Error handling

Errors MUST identify the failing boundary when possible:

- CLI validation;
- harness detection;
- provider configuration;
- credential resolution;
- local proxy;
- model resolution;
- protocol translation;
- provider request;
- streaming;
- tool conversion;
- harness launch;
- cleanup.

Errors MUST avoid exposing credentials, full authorization headers, or unredacted provider responses containing secret echoes.

Errors SHOULD provide one concrete remediation command or action.

### FR-021: Argument parsing

The CLI SHOULD use harness-first syntax for the first public release.

Product arguments and harness arguments MUST be separated predictably with `--`.

The parser MUST have tests for:

- harness-first commands;
- conflicting product flags;
- inline custom provider values;
- passthrough arguments;
- paths with spaces;
- values beginning with dashes;
- non-interactive invocation.

### FR-022: Session visibility

The product SHOULD provide commands to list active and stale sessions.

Session output MUST omit secret values.

### FR-023: Provider profile management

The product MUST support adding, listing, inspecting, updating, exporting, and removing provider profiles.

Profile export MUST exclude resolved secret values by default.

### FR-024: Destination transparency

Before a remote inference request, the product MUST make the selected destination hostname visible in normal or dry-run output.

The product MUST NOT silently fail over to a different provider.

## 3. Security requirements

### SR-001: Secret persistence

The product MUST NOT persist active provider API keys in plaintext SQLite, JSON, TOML, YAML, logs, crash reports, or permanent harness configuration.

Saved profiles SHOULD store environment-variable references by default.

Persistent encrypted storage requires a separate approved ADR and should use an operating-system credential store or equivalent reviewed system.

### SR-002: Local proxy binding

Local proxies MUST bind to `127.0.0.1` or `::1` by default.

Binding to a non-loopback address MUST require an explicit dangerous option and prominent warning.

The initial stable release SHOULD NOT support external proxy binding unless separately reviewed.

### SR-003: Local client authentication

A local proxy MUST use a random per-session client token when the harness can send one.

The token MUST have sufficient entropy, MUST be unique per session, and MUST NOT be persisted after session completion.

Where a harness cannot send a token, the threat and alternate controls MUST be documented.

### SR-004: Log redaction

The logging layer MUST redact:

- Authorization values;
- provider-specific key headers;
- direct secret CLI arguments;
- credentials embedded in URLs;
- secret query parameters;
- local proxy tokens;
- known secret JSON fields.

Logs SHOULD exclude request and response bodies by default.

### SR-005: Temporary file permissions

Secret-bearing files MUST use owner-only permissions where supported.

Temporary directories MUST be created through secure operating-system APIs and MUST NOT rely solely on predictable process IDs or usernames.

### SR-006: Redirect control

Credentials MUST NOT be forwarded automatically to a different origin after a redirect.

Authenticated provider requests SHOULD disable redirects or permit only same-origin redirects unless an explicit trusted policy exists.

### SR-007: Input validation

The product MUST validate:

- base URL scheme;
- header names and values;
- query parameter names;
- model IDs for control characters;
- executable paths;
- local config and temporary paths;
- imported provider profile schemas.

The product MUST reject CRLF injection.

### SR-008: Subprocess safety

The product MUST spawn harnesses without shell interpolation where possible.

Arguments MUST be passed as an argument array.

The product MUST display the resolved executable path in dry-run.

### SR-009: Persistent database contents

Persistent stores MAY contain:

- provider profile metadata;
- API-key environment-variable names;
- model metadata;
- compatibility metadata;
- non-secret session summaries;
- timestamps;
- aggregate usage where available;
- cleanup state.

They MUST NOT contain active secret values under the default design.

### SR-010: Crash reporting

Crash reports MUST redact secrets.

Crash reports SHOULD omit prompts, source code, tool arguments, and environment dumps by default.

### SR-011: Proxy relay restrictions

The local proxy MUST be bound to a single resolved session provider configuration.

It MUST NOT expose a general unauthenticated forwarding endpoint capable of choosing arbitrary destinations.

### SR-012: Profile import safety

Imported profiles MUST be treated as untrusted data.

Profiles MUST NOT support arbitrary executable hooks or embedded code.

The product MUST show the destination before the first use of an imported custom provider.

### SR-013: Secret canary tests

The test suite MUST use canary secrets and scan logs, persistent stores, temporary paths, and generated configuration for leakage.

## 4. Reliability requirements

### RR-001: Together regression

All current supported TogetherLink behavior included in the selected fork baseline MUST continue passing after provider-neutral refactoring unless an intentional change is approved and documented.

### RR-002: Retry policy

Retries MUST be bounded.

The product MUST distinguish retriable and non-retriable failures.

Authentication failures, invalid models, and deterministic validation failures MUST NOT be retried without a documented request-policy change.

### RR-003: Cancellation

User cancellation MUST propagate to the harness request, local proxy, and provider HTTP request where supported.

Cancellation MUST stop additional retries.

### RR-004: Port allocation

The product MUST support dynamic loopback port allocation.

The session MUST verify that the listener is ready and product-owned before launching the harness.

### RR-005: Process ownership

Cleanup MUST use process handles, parent-child relationships, creation markers, or equivalent evidence.

The product MUST NOT kill processes based solely on executable name or port number.

### RR-006: Idempotent cleanup

Running cleanup repeatedly MUST result in the same safe final state.

### RR-007: Policy versioning

The product SHOULD record the compatibility-policy version used for each session so failures can be reproduced.

### RR-008: Bounded buffering

Streaming and translation paths MUST avoid unbounded buffering of prompts, output, or tool arguments.

### RR-009: Timeout controls

The product MUST have configurable, bounded timeouts for:

- provider connection;
- provider response;
- proxy readiness;
- graceful process shutdown;
- cleanup.

### RR-010: Concurrent sessions

Concurrent sessions MUST use distinct IDs, tokens, ports, and temporary resources.

One session's cleanup MUST NOT affect another session.

## 5. Performance requirements

### PR-001: Launch overhead

For environment-only or inline-config launches, product processing before spawning the harness SHOULD remain below one second on a typical developer machine, excluding optional provider probes.

### PR-002: Proxy overhead

The loopback proxy SHOULD add minimal processing latency. Initial target: median local processing overhead below 20 milliseconds for a non-streaming request, excluding provider network time and translation buffering.

### PR-003: Streaming latency

The proxy SHOULD forward text deltas promptly without waiting for full completion.

### PR-004: Memory

A single idle proxy session SHOULD have bounded and documented memory usage.

Large responses SHOULD be streamed rather than copied multiple times.

## 6. Portability requirements

### POR-001: Operating systems

The architecture MUST account for Linux, macOS, and Windows.

A platform MUST NOT be labeled supported until CI and manual smoke tests pass for the declared harness path.

### POR-002: Paths

Path handling MUST use platform-aware APIs.

The product MUST NOT assume Unix home paths, permission modes, symlink behavior, or signals on Windows.

### POR-003: Shutdown behavior

The product MUST implement and test platform-appropriate handling for:

- Ctrl+C;
- terminal closure;
- parent termination;
- harness exit;
- proxy exit;
- machine restart with stale metadata.

### POR-004: Encoding

The product MUST handle Unicode in home paths, repository paths, model IDs, provider labels, and harness arguments without shell corruption.

## 7. Maintainability requirements

### MR-001: Harness boundary

Harness-specific detection, configuration injection, argument behavior, and process lifecycle MUST live behind a documented harness adapter.

Adding a provider MUST NOT require editing every harness adapter unless the provider introduces a new protocol requirement.

### MR-002: Provider boundary

Provider authentication, base URL, headers, paths, model catalog, and compatibility policy MUST live behind provider-neutral interfaces.

### MR-003: Protocol boundary

Protocol translation MUST be separate from provider-specific normalization.

### MR-004: Typed external boundaries

Provider profiles, imported configuration, daemon messages, protocol requests, and persistent records MUST be validated at runtime.

### MR-005: Documentation synchronization

A change modifying launch behavior, persistence, credentials, protocol translation, supported versions, or compatibility claims MUST update documentation in the same pull request.

### MR-006: ADR use

A decision affecting multiple adapters, persistent formats, protocol boundaries, security posture, or public CLI behavior MUST be recorded in an ADR.

### MR-007: Testability

Protocol and provider behavior MUST be testable against deterministic fixtures and mock servers without real credentials.

## 8. User experience requirements

### UX-001: Safe defaults

Defaults MUST favor configuration preservation, destination transparency, and credential safety over convenience.

### UX-002: Warning levels

Warnings MUST distinguish:

- informational note;
- degraded capability;
- unsafe configuration;
- launch blocker.

### UX-003: Non-interactive mode

The product MUST support deterministic non-interactive operation for CI and benchmarks.

Warnings requiring confirmation in interactive mode MUST have explicit continuation or failure behavior in non-interactive mode.

### UX-004: Secret prompts

Interactive secret entry MUST disable terminal echo.

### UX-005: Remediation

Errors SHOULD include a concrete next action, such as running doctor, setting an environment variable, selecting a tested model, or cleaning a stale session.

### UX-006: Honest unknowns

Unknown context limits, prices, capabilities, and provider behaviors MUST be shown as unknown rather than guessed.

## 9. Data requirements

### DR-001: Provider profile schema

A provider profile MUST include:

- stable provider ID;
- display label;
- base URL;
- protocol;
- authentication type;
- API-key environment-variable name when applicable;
- optional headers and query parameters;
- model metadata or discovery settings;
- compatibility-policy reference.

### DR-002: Model schema

A provider model SHOULD include:

- exact provider model ID;
- display label;
- aliases;
- context and output limits when known;
- capability flags;
- optional provider-specific pricing with source and timestamp;
- verification state and test date.

Unknown values MUST remain unknown.

### DR-003: Session record

A non-secret session record MAY contain:

- session ID;
- start and end time;
- harness ID and version;
- provider ID;
- model ID;
- protocol path;
- isolation strategy;
- policy version;
- exit category;
- cleanup result;
- aggregate usage.

### DR-004: Schema versioning

Persistent provider profiles and session databases MUST include schema versions and migration tests.

### DR-005: Pricing metadata

Pricing MUST be provider-specific, optional, sourced, and timestamped.

The product MUST not use Together pricing for the same model through another provider.

## 10. Release requirements

### REL-001: Alpha gate

Public alpha requires:

- planning documents complete;
- Together regression passing;
- OpenCode plus Ollama working;
- one cloud provider working;
- configuration-integrity tests;
- no known plaintext active key persistence in shipped session paths;
- documented limitations;
- security contact.

### REL-002: Beta gate

Beta requires:

- all three version 1 harnesses demonstrated;
- protocol contract tests;
- cross-platform smoke coverage matching support claims;
- profile and database migration tests;
- upgrade and rollback tests;
- published compatibility levels.

### REL-003: Stable gate

Stable requires:

- support and deprecation policies;
- backward-compatible migration strategy;
- vulnerability reporting process;
- no unresolved critical security issues;
- accepted crash cleanup reliability;
- at least one release-candidate cycle;
- license and attribution review;
- compatibility claims audited against evidence.

## 11. Traceability

Milestone issues SHOULD reference applicable requirement IDs.

Automated tests SHOULD include requirement IDs in test names, metadata, or linked documentation where practical.

A requirement may be revised only through documented review, with affected tests, roadmap, and release gates updated together.
