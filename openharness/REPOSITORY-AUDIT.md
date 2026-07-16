# TogetherLink Repository Audit Baseline

## 1. Purpose

This document records known architecture observations that motivate the provider-neutral refactor and defines the audit that must be completed against the exact upstream commit selected for the fork.

File paths and behavior must be revalidated before coding.

## 2. Known observations

### 2.1 Harness implementations

The baseline contains harness-specific code for OpenCode, Claude, Codex, and Pi. This adapter concept should be preserved rather than replaced with provider-harness pair implementations.

### 2.2 Together-specific core

The core contains Together-specific base URL, key resolution, helper names, model metadata, and branding. The shared upstream client targets Together's Chat Completions endpoint.

Required change:

- parameterize base URL, auth, headers, query parameters, model, and policy;
- move Together values into a provider preset;
- preserve tested retry and context behavior.

### 2.3 OpenCode path

OpenCode already uses process-scoped inline configuration. Existing provider generation is Together-specific in SDK adapter, provider name, models, and key handling.

Required change:

- data-driven provider generation;
- generic compatible SDK adapter where appropriate;
- runtime base URL and headers;
- preserved no-permanent-config behavior.

### 2.4 Claude path

Claude is launched through a local proxy and environment injection. The lifecycle is reusable, but provider data and labels are Together-specific.

Required change:

- provider runtime through proxy session;
- preserve Messages-to-Chat translation;
- generic model metadata, errors, and banners.

### 2.5 Codex path

Codex uses a local proxy and shared upstream behavior. Provider runtime must reach Codex proxy options and the generic client.

### 2.6 Shared proxied session

The current session specification carries API key and model details but not a complete provider runtime.

Required path:

```text
CLI
-> harness context
-> proxied session specification
-> daemon registration
-> daemon session state
-> Claude/Codex proxy options
-> provider-neutral client
```

### 2.7 Daemon persistence

Initial inspection found SQLite session fields for API key and local authentication token. This conflicts with the new security requirements.

Required change:

- session secrets in memory only;
- persistent non-secret metadata only;
- migration and restart behavior;
- canary database tests.

### 2.8 Global configuration

The baseline can store a literal key or an environment reference. The new product should default to environment references. Persistent secret storage requires a separate design.

### 2.9 Model package

The baseline model package contains Together-specific IDs, aliases, pricing, capabilities, and limits.

Required change:

- provider-scoped model records;
- unknown values remain unknown;
- no reuse of Together pricing across providers;
- generic schema separated from provider catalog data.

### 2.10 CLI parser

The baseline parser is harness-oriented and may treat later arguments as passthrough. The first public syntax should be canonical and unambiguous:

```bash
product run <harness> --provider <provider> --model <model> -- <harness args>
```

Provider-first aliases can be evaluated later.

## 3. Audit procedure

### 3.1 Repository and legal

- record upstream URL and commit SHA;
- record license and attribution requirements;
- inspect package licenses;
- identify branding/trademark changes;
- document contribution and release process.

### 3.2 Package map

For every package record:

- purpose;
- entry points;
- public API;
- build output;
- tests;
- runtime dependencies;
- persistent files;
- environment variables.

### 3.3 Together reference inventory

Search case-insensitively for:

```text
together
togetherlink
TOGETHER_
TOGETHERLINK_
api.together
@ai-sdk/together
model catalog names
pricing constants
```

Classify every occurrence:

- branding;
- package name;
- environment variable;
- endpoint;
- authentication;
- model metadata;
- pricing;
- error text;
- protocol behavior;
- persistence;
- tests;
- docs;
- telemetry/update behavior.

Do not bulk replace before classification.

### 3.4 Credential flow

For every secret source document:

- source and precedence;
- in-memory representation;
- receiving functions;
- subprocess inheritance;
- temporary files;
- database/config writes;
- log/error paths;
- cleanup.

Produce a key-resolution-to-provider-request sequence diagram.

### 3.5 Process/session map

Document:

- CLI parent;
- daemon start/discovery;
- registration;
- proxy listener;
- harness child;
- signals;
- stale recovery;
- port allocation;
- PID persistence;
- ownership checks.

### 3.6 Harness audit

For OpenCode, Claude, Codex, and Pi record:

- detection/version assumptions;
- config injection;
- variables;
- files read/written;
- protocol;
- model mapping;
- tools;
- cleanup;
- tests.

### 3.7 Protocol audit

Document coverage of:

- Anthropic Messages request/stream;
- OpenAI Responses request/stream;
- OpenAI Chat request/stream;
- tools;
- vision;
- reasoning;
- usage;
- errors.

Identify lossy and unsupported fields.

### 3.8 Persistence audit

Inventory:

- SQLite schemas;
- JSON config;
- temp directories;
- logs;
- locks;
- sockets/ports;
- caches;
- update state.

Classify each field as secret, sensitive, non-sensitive, or integrity-critical.

### 3.9 Test audit

Record:

- frameworks;
- commands;
- integration setup;
- live dependencies;
- fixtures;
- gaps in crash, security, and config-integrity tests;
- baseline expected results.

### 3.10 Build/release audit

Record:

- package manager/runtime;
- build commands;
- generated files;
- platform artifacts;
- publishing;
- auto-update;
- CI workflows;
- release credentials.

## 4. Audit deliverables

The audit is complete when the repository contains:

1. exact upstream commit;
2. package dependency diagram;
3. Together reference inventory;
4. credential data-flow diagram;
5. process/session diagram;
6. persistence classification;
7. harness acceptance sheets;
8. protocol coverage table;
9. baseline test report;
10. prioritized refactor issues.

## 5. Refactor constraints

The first implementation pull request should avoid:

- broad branding rename;
- adding several providers;
- unrelated CLI redesign;
- simultaneous protocol semantic changes;
- deleting baseline tests;
- large package moves.

Preferred first pull request:

> Introduce provider-neutral runtime configuration and preserve current behavior through the Together provider preset.
