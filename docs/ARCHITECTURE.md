# Architecture

## 1. Purpose

This document defines the target architecture for a provider-neutral, session-scoped coding-harness launcher built from a TogetherLink fork.

The architecture avoids implementing every harness-provider pair independently.

```text
Bad:  harness count x provider count
Good: harness adapters + protocol adapters + provider adapters
```

## 2. Architectural goals

1. Preserve existing harness configuration.
2. Keep Together AI working while generalizing the core.
3. Isolate harness-specific behavior.
4. Isolate provider-specific behavior.
5. Isolate protocol translation from provider quirks.
6. Make compatibility explicit and testable.
7. Keep active credentials ephemeral during sessions.
8. Support local and hosted providers.
9. Provide deterministic, ownership-safe cleanup.
10. Make adding a new harness or provider bounded work.
11. Expose the resolved destination and protocol path.
12. Allow deterministic testing without real provider access.

## 3. Architectural non-goals

The initial architecture does not attempt to:

- expose one universal protocol with perfect feature parity;
- emulate every proprietary provider feature;
- reuse OAuth subscriptions;
- provide a hosted multi-tenant gateway;
- permanently synchronize all harness configurations;
- guarantee compatibility based only on a provider's marketing claim;
- silently route to fallback models or providers;
- provide a plugin system executing untrusted code.

## 4. System context

The user invokes the product CLI. The CLI resolves a harness adapter, provider configuration, exact model, compatibility policy, and isolation strategy. Depending on the harness and provider protocols, the harness either connects directly to the provider using process-scoped configuration or connects to a product-owned loopback proxy that translates requests and streams.

See [diagrams/system-context.md](diagrams/system-context.md).

## 5. Component model

```text
CLI and Application Layer
├── command parser
├── provider/profile commands
├── configuration resolver
├── doctor
├── dry-run renderer
├── compatibility evaluator
└── user-facing diagnostics

Session Layer
├── session manager
├── process supervisor
├── temporary-resource manager
├── port allocator
├── session ownership registry
└── cleanup coordinator

Harness Layer
├── OpenCode adapter
├── Claude Code adapter
├── Codex adapter
└── future harness adapters

Protocol Layer
├── OpenAI Chat passthrough
├── Anthropic Messages -> OpenAI Chat
├── OpenAI Responses -> OpenAI Chat
└── future protocol adapters

Provider Layer
├── provider preset registry
├── saved profile resolver
├── authentication policy
├── compatibility policy
├── model catalog and discovery
└── upstream HTTP/streaming client

Persistence Layer
├── non-secret provider profiles
├── non-secret session metadata
├── compatibility evidence
└── schema migrations

Cross-cutting
├── runtime schema validation
├── structured redacted logging
├── error taxonomy
├── cancellation
├── telemetry policy
└── deterministic test fixtures
```

## 6. Core abstractions

### 6.1 Provider protocol

```ts
export type ProviderProtocol = "openai-chat" | "openai-responses" | "anthropic-messages" | "gemini";
```

Version 1 primarily targets `openai-chat` upstream. The wider union avoids coupling the data model to one permanent protocol choice.

### 6.2 Provider authentication

```ts
export type ProviderAuth =
  | {
      type: "bearer";
      apiKeyEnv: string;
      required: boolean;
    }
  | {
      type: "header";
      headerName: string;
      apiKeyEnv: string;
      required: boolean;
    }
  | {
      type: "none";
    };
```

Authentication describes how to build the upstream request. It does not contain the resolved key in persistent form.

### 6.3 Provider configuration

```ts
export type ProviderConfig = {
  id: string;
  label: string;
  baseURL: string;
  protocol: ProviderProtocol;
  auth: ProviderAuth;
  headers?: Record<string, string>;
  secretHeaderNames?: string[];
  queryParams?: Record<string, string>;
  models: ProviderModel[];
  modelDiscovery?: ModelDiscoveryConfig;
  compatibilityPolicyId?: string;
};
```

A provider profile describes how to reach a provider. It must not contain harness-specific variable names or launch behavior.

### 6.4 Provider model

```ts
export type ProviderModel = {
  id: string;
  label: string;
  aliases?: string[];
  limits?: {
    contextTokens?: number;
    outputTokens?: number;
  };
  capabilities?: {
    text?: boolean;
    streaming?: boolean;
    tools?: boolean;
    parallelTools?: boolean;
    vision?: boolean;
    reasoning?: boolean;
    temperature?: boolean;
    jsonMode?: boolean;
  };
  pricing?: {
    currency: "USD";
    inputPerMillion?: number;
    outputPerMillion?: number;
    cachedInputPerMillion?: number;
    source?: string;
    updatedAt?: string;
  };
  verification?: {
    state: "untested" | "inferred" | "tested" | "recommended" | "regressed";
    testedAt?: string;
    testSuiteVersion?: string;
  };
};
```

Model metadata is provider-scoped. The same underlying model may have different IDs, prices, context limits, or behavior through different providers.

### 6.5 Harness adapter

```ts
export type HarnessProtocol = "openai-chat" | "openai-responses" | "anthropic-messages" | "gemini";

export type IsolationStrategy =
  | "environment"
  | "inline-config"
  | "shadow-config"
  | "local-proxy"
  | "temporary-patch";

export interface HarnessAdapter {
  readonly id: string;
  readonly label: string;
  readonly inputProtocol: HarnessProtocol;

  detect(): Promise<HarnessDetection>;
  plan(context: LaunchContext): Promise<LaunchPlan>;
  validate(plan: LaunchPlan): Promise<ValidationResult>;
  launch(plan: LaunchPlan): Promise<RunningHarness>;
}
```

The harness adapter owns:

- executable discovery and version detection;
- harness-specific configuration injection;
- argument passthrough;
- environment construction;
- process start and exit observation;
- known configuration paths;
- harness-specific cleanup.

It does not own provider authentication or provider request normalization.

### 6.6 Protocol adapter

```ts
export interface ProtocolAdapter {
  readonly from: HarnessProtocol;
  readonly to: ProviderProtocol;

  validateCapabilities(context: TranslationContext): ValidationResult;
  translateRequest(request: unknown, context: TranslationContext): unknown;
  translateStream(event: unknown, context: TranslationContext): unknown[];
  translateError(error: unknown, context: TranslationContext): unknown;
}
```

Protocol translation and provider policy are separate layers. Converting Anthropic content blocks into Chat messages is protocol behavior. Removing a field unsupported by Groq is provider policy.

### 6.7 Provider compatibility policy

```ts
export type ProviderCompatibilityPolicy = {
  id: string;
  version: string;
  stripRequestFields?: string[];
  renameRequestFields?: Record<string, string>;
  allowedToolChoiceValues?: string[];
  supportsStreamUsage?: boolean;
  supportsStrictTools?: boolean;
  supportsParallelTools?: boolean;
  maxTemperature?: number;
  endpointPath?: string;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
  responseUsageMode?: "standard" | "stream-final" | "unavailable";
};
```

Policies must be versioned, testable, and observable in debug output. They must never silently substitute models.

### 6.8 Launch context

```ts
export type LaunchContext = {
  harness: HarnessAdapter;
  provider: ProviderConfig;
  model: ProviderModel;
  resolvedApiKey?: string;
  passthroughArgs: string[];
  parentEnvironment: NodeJS.ProcessEnv;
  sessionId: string;
  nonInteractive: boolean;
  allowDegraded: boolean;
};
```

The resolved API key exists only in memory and should be omitted from generic serialization.

### 6.9 Launch plan

```ts
export type LaunchPlan = {
  sessionId: string;
  harnessExecutable: string;
  harnessVersion?: string;
  harnessArgs: string[];
  isolationStrategy: IsolationStrategy;
  environmentOverrides: Record<string, string>;
  secretEnvironmentNames: string[];
  temporaryResources: TemporaryResourcePlan[];
  proxy?: ProxyPlan;
  compatibility: CompatibilityDecision;
  expectedPersistentEffects: PersistentEffect[];
};
```

Dry-run renders a redacted LaunchPlan. The executable launch path uses a non-redacted internal structure only in memory.

## 7. Configuration resolution

### 7.1 Sources

Configuration may come from:

- built-in provider presets;
- saved local provider profiles;
- environment variables;
- explicit launch arguments;
- harness detection;
- model discovery;
- compatibility registry;
- product global defaults.

### 7.2 Precedence

```text
launch arguments
> selected provider profile
> provider preset defaults
> product global defaults
```

The resolver produces one normalized in-memory configuration before the harness starts.

### 7.3 Profile storage

A normal profile stores:

```json
{
  "id": "openrouter",
  "baseURL": "https://openrouter.ai/api/v1",
  "protocol": "openai-chat",
  "auth": {
    "type": "bearer",
    "apiKeyEnv": "OPENROUTER_API_KEY",
    "required": true
  }
}
```

It does not store the resolved secret value.

### 7.4 Secret resolution

Secret resolution occurs as late as practical, normally after launch planning but before provider validation or proxy startup.

Secrets may be passed only to:

- the upstream client;
- an in-memory proxy session;
- a secure temporary configuration path if the harness absolutely requires it.

Persistent session records receive no secret.

### 7.5 Model resolution

The resolver selects the exact provider model ID using:

1. explicit model ID;
2. explicit alias scoped to the selected provider;
3. optional provider profile default;
4. no automatic fallback unless the user configured one explicitly.

If the model is not discoverable, the product may continue with a manual ID but marks the model unverified.

## 8. Session lifecycle

### 8.1 States

```text
CREATED
-> PLANNED
-> VALIDATED
-> STARTING_PROXY (optional)
-> STARTING_HARNESS
-> RUNNING
-> STOPPING
-> CLEANING
-> CLOSED
```

Failure states identify the boundary:

```text
FAILED_VALIDATION
FAILED_PROXY_START
FAILED_HARNESS_START
FAILED_RUNTIME
FAILED_CLEANUP
```

See [diagrams/session-lifecycle.md](diagrams/session-lifecycle.md).

### 8.2 Session ownership record

The session manager tracks:

- random session ID;
- parent process identity;
- harness process handle and creation evidence;
- proxy server or process handle;
- loopback listener address and port;
- temporary directory;
- exact created file list;
- cleanup state;
- provider and model identifiers without credentials;
- compatibility-policy version.

The manager must not use executable names alone as ownership proof.

### 8.3 Session start order

1. Parse CLI.
2. Resolve provider and model.
3. Detect harness and version.
4. Evaluate compatibility.
5. Build LaunchPlan.
6. Resolve secret.
7. Create secure session resources.
8. Start proxy if needed.
9. Verify proxy readiness and ownership.
10. Spawn harness.
11. Monitor harness and proxy.
12. Begin cleanup after exit or failure.

### 8.4 Cleanup order

1. Stop accepting new proxy requests.
2. Cancel in-flight provider requests.
3. Request graceful harness shutdown when product-owned.
4. Wait a bounded grace period.
5. Terminate remaining product-owned processes if required.
6. Close listeners.
7. Remove secret-bearing temporary files.
8. Remove empty product-owned directories.
9. Mark session closed or cleanup-incomplete.
10. Emit a redacted result.

Cleanup is idempotent.

## 9. Harness architecture

### 9.1 OpenCode

OpenCode is the initial proof because provider configuration can be supplied to the launched process. The target design creates an inline provider entry using an OpenAI-compatible SDK adapter, provider base URL, key reference, headers, and model catalog.

Path:

```text
Product CLI
-> construct process-scoped OpenCode provider config
-> launch OpenCode with inline config environment
-> OpenCode connects directly to provider
```

No translation proxy is required when the selected provider and SDK path are compatible.

The adapter must:

- generate a unique provider ID that does not collide with user entries;
- avoid writing the user's normal config;
- avoid copying unrelated user secrets;
- pass harness arguments after `--` unchanged;
- include exact model IDs;
- support no-auth local endpoints;
- report generated configuration in redacted form;
- remove temporary resources after exit.

See [diagrams/opencode-sequence.md](diagrams/opencode-sequence.md).

### 9.2 Claude Code

Claude Code uses Anthropic-compatible requests. For an OpenAI Chat provider, a local loopback proxy translates the protocol.

Path:

```text
Claude Code
-> Anthropic Messages request to loopback proxy
-> protocol adapter creates Chat request
-> provider policy normalizes request
-> upstream client sends provider request
-> provider stream translated to Anthropic stream
-> Claude Code receives expected events
```

The adapter injects only process-scoped environment into the launched Claude process.

Critical translation responsibilities:

- system prompt blocks;
- user and assistant content blocks;
- image blocks if supported later;
- tool definitions;
- tool-use blocks;
- tool-result blocks;
- stop reasons;
- token usage when available;
- streaming event ordering;
- tool argument fragment assembly;
- cancellation;
- context, auth, rate, and invalid-request errors.

See [diagrams/claude-sequence.md](diagrams/claude-sequence.md).

### 9.3 Codex

Codex may use OpenAI Responses semantics. When the provider supports only Chat Completions, a local proxy translates Responses to Chat.

Path:

```text
Codex
-> Responses request to loopback proxy
-> protocol adapter maps input and tools to Chat
-> provider policy normalizes request
-> upstream Chat request
-> provider events translated into Responses events
-> Codex receives output and tool calls
```

Not every Responses feature can be represented. The adapter must classify behavior as:

- exact mapping;
- safe mapping with warning;
- unsupported and blocked.

See [diagrams/codex-sequence.md](diagrams/codex-sequence.md).

### 9.4 Future harness adapter acceptance

A new harness requires:

- executable and version detection;
- protocol declaration;
- safe isolation strategy;
- known config paths;
- passthrough behavior;
- process lifecycle;
- config-integrity tests;
- crash cleanup tests;
- compatibility entries;
- published limitations.

## 10. Provider architecture

### 10.1 Built-in presets

Built-in presets contain only public, non-secret defaults:

- provider ID and label;
- base URL;
- protocol;
- auth type;
- default key environment-variable name;
- required public headers;
- model discovery behavior;
- compatibility-policy reference.

Together AI becomes the first preset in the generalized architecture.

### 10.2 Generic provider

A generic custom provider requires:

- base URL;
- protocol selection;
- model ID;
- authentication type;
- optional headers and query parameters;
- optional compatibility overrides.

The product must not infer full compatibility from a successful basic request.

### 10.3 Model discovery

Discovery is an optional convenience. It must:

- use the selected provider authentication;
- support pagination or provider variants where documented;
- tolerate absence of `/models`;
- preserve exact model IDs;
- mark discovered capability metadata as unknown unless provided reliably;
- avoid treating discovery as a tool-support test.

### 10.4 Provider probing

Probing may test:

- connectivity;
- model existence;
- basic non-streaming response;
- streaming;
- tool calls;
- unsupported parameter behavior.

Probing is explicit because it can consume tokens and create provider logs. It uses synthetic prompts only.

### 10.5 Upstream client

The provider-neutral upstream client owns:

- normalized URL construction;
- auth header construction;
- custom headers and query parameters;
- timeout and cancellation;
- bounded retries;
- redirect control;
- SSE or stream parsing;
- response-size limits;
- redacted error capture;
- request correlation IDs.

Suggested interface:

```ts
export type UpstreamClientOptions = {
  baseURL: string;
  apiKey?: string;
  auth: ProviderAuth;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  redirectPolicy: RedirectPolicy;
};
```

The generic client must not import Together-specific constants.

## 11. Protocol architecture

### 11.1 Translation pipeline

```text
Harness request
-> inbound schema validation
-> protocol translation
-> canonical request validation
-> provider compatibility policy
-> upstream HTTP client
-> provider response parsing
-> provider normalization
-> reverse protocol translation
-> harness stream/response
```

### 11.2 Translation invariants

- model ID is preserved unless the user explicitly mapped it;
- terminal completion is emitted exactly once;
- tool-call IDs remain unique and stable;
- malformed tool arguments produce a typed error;
- cancellation propagates upstream;
- unsupported semantic loss is not silent;
- usage is marked partial or unavailable when exact mapping is impossible.

### 11.3 Canonical protocol limitation

OpenAI Chat is the initial upstream target because many local and hosted open-source providers support it. This does not mean it can represent every Responses, Anthropic, or Gemini feature.

The architecture preserves protocol adapters as separate components so native upstream protocols can be added later.

## 12. Daemon and persistence

The baseline may use a daemon to manage proxied sessions. The generalized architecture may retain it if it improves lifecycle and multi-session behavior, but all messages must become provider-neutral.

### 12.1 Runtime-only daemon data

The daemon may hold in memory:

- resolved API key;
- provider base URL;
- resolved auth headers;
- model ID;
- local proxy token;
- protocol adapter state;
- in-flight request handles.

### 12.2 Persistent data

Persistent storage may contain only non-secret data such as:

- session ID;
- harness/provider/model IDs;
- start and end time;
- process ownership metadata with platform caveats;
- cleanup status;
- aggregate usage;
- compatibility-policy version.

Plaintext API keys and local proxy tokens are prohibited.

### 12.3 Daemon restart

After a daemon restart, a credentialed session cannot be transparently resumed without a separately approved secure secret store. The daemon should mark the session stale and safely clean product-owned resources.

### 12.4 Schema migrations

Persistent schemas must include a version. Migrations should be additive where possible and tested in both upgrade and rollback scenarios.

## 13. Error architecture

```ts
export type ProductErrorCode =
  | "INVALID_CLI"
  | "HARNESS_NOT_FOUND"
  | "HARNESS_VERSION_UNSUPPORTED"
  | "PROVIDER_CONFIG_INVALID"
  | "CREDENTIAL_MISSING"
  | "PROVIDER_UNREACHABLE"
  | "MODEL_NOT_FOUND"
  | "CAPABILITY_UNSUPPORTED"
  | "PROXY_START_FAILED"
  | "LOCAL_PROXY_UNAUTHORIZED"
  | "TRANSLATION_FAILED"
  | "UPSTREAM_AUTH_FAILED"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_CONTEXT_EXCEEDED"
  | "UPSTREAM_INVALID_REQUEST"
  | "UPSTREAM_TIMEOUT"
  | "STREAM_FAILED"
  | "HARNESS_START_FAILED"
  | "CLEANUP_INCOMPLETE";
```

Each error carries:

- safe user message;
- boundary;
- retriable flag;
- remediation suggestion;
- redacted diagnostic detail;
- optional provider status code;
- session ID and request ID.

## 14. Observability

### 14.1 Default logs include

- session and request IDs;
- harness, provider, and model identifiers;
- protocol path;
- isolation strategy;
- process lifecycle;
- provider status category;
- latency and usage when available;
- cleanup result.

### 14.2 Default logs exclude

- API keys;
- authorization headers;
- prompts;
- source code;
- full tool arguments;
- full model output;
- complete environment dumps.

### 14.3 Debug logging

Debug mode may include redacted request shape and policy changes. Full body logging should require a separate explicitly unsafe option and warning.

### 14.4 Request correlation

Every proxied request receives a request ID associated with its session. The ID is used across translation, provider policy, upstream, stream, and error logs.

## 15. Extension model

### 15.1 Adding a provider

A normal OpenAI Chat-compatible provider should require:

1. a provider preset or profile;
2. authentication rule;
3. optional compatibility policy;
4. model metadata or discovery;
5. provider contract tests;
6. compatibility entries.

No harness adapter should change unless the provider introduces a new protocol.

### 15.2 Adding a harness

A harness requires:

1. detection and supported versions;
2. input protocol;
3. isolation strategy;
4. temporary configuration behavior;
5. argument passthrough;
6. process and cleanup behavior;
7. harness contract tests;
8. config-integrity tests;
9. compatibility entries.

### 15.3 Adding a protocol

A new protocol requires:

- request schema;
- stream schema;
- error mapping;
- tool mapping;
- multimodal mapping;
- usage mapping;
- capability-loss documentation;
- fixtures and contract tests;
- at least one end-to-end implementation.

## 16. Conceptual repository layout

The exact physical layout should respect the existing monorepo, but conceptual ownership should resemble:

```text
packages/
├── cli/
│   └── src/
│       ├── commands/
│       ├── config/
│       ├── harnesses/
│       ├── sessions/
│       └── diagnostics/
├── core/
│   └── src/
│       ├── providers/
│       ├── models/
│       ├── compatibility/
│       ├── protocols/
│       ├── upstream/
│       ├── security/
│       └── errors/
├── daemon/
│   └── src/
│       ├── sessions/
│       ├── storage/
│       └── proxy/
└── test-fixtures/
    ├── anthropic/
    ├── responses/
    ├── chat/
    └── providers/
```

A broad file move should not be combined with the first provider-neutral refactor unless necessary.

## 17. Migration from Together-specific core

### Phase A: Provider-neutral types

- add provider, auth, model, policy, and launch types;
- represent Together as data;
- keep existing behavior unchanged.

### Phase B: Generic upstream client

- remove hard-coded Together base URL;
- accept runtime base URL, auth, headers, query parameters, model, and policy;
- preserve tested retry and streaming behavior.

### Phase C: Thread provider runtime

```text
CLI
-> HarnessContext
-> ProxiedSessionSpec
-> daemon registration
-> daemon SessionState
-> proxy options
-> upstream client
```

### Phase D: Remove secret persistence

- stop writing active keys and local tokens;
- migrate old schema;
- define restart behavior;
- add canary tests.

### Phase E: Prove providers incrementally

1. Together regression;
2. Ollama through OpenCode;
3. OpenRouter through OpenCode;
4. OpenRouter or Together through Claude proxy;
5. Codex through Chat translation;
6. Groq policy.

### Phase F: Rename branding last

Rename packages, commands, environment prefixes, and files only after architecture and behavior are stable.

## 18. Architecture review checklist

A design is ready for implementation when:

- component ownership is clear;
- boundary data is typed and validated;
- credential exposure is documented;
- persistent filesystem effects are documented;
- process ownership and cleanup are documented;
- error and cancellation behavior are documented;
- compatibility impact is documented;
- test coverage can be named;
- cross-platform concerns are addressed;
- a long-lived decision has an ADR;
- rollback behavior is defined.
