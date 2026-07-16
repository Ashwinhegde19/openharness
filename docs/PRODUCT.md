# Product Definition

## 1. Document purpose

This document defines the product problem, product boundaries, target users, value proposition, version 1 scope, non-goals, success measures, constraints, and product-review process for the Universal Harness Provider Layer, referred to here as **the product**.

The final public name is deliberately unresolved. Naming must not affect architecture or delay validation.

## 2. Executive summary

Developers increasingly use several coding harnesses and several model providers. Each harness expects different environment variables, configuration files, model identifiers, authentication mechanisms, and API protocols. Switching a provider often requires modifying persistent configuration and later restoring it. This creates friction, inconsistent tests, broken setups, and credential risk.

The product provides a session-scoped launcher and compatibility layer. The user selects:

- a coding harness;
- a provider;
- a model;
- credentials or an environment-variable reference **only when that provider requires them**.

Together AI is **not** the product identity. It is one optional provider preset (the implementation baseline was forked from TogetherLink). Local no-auth providers such as Ollama must work without any cloud API key.

The product chooses the safest supported launch strategy:

1. environment-only injection;
2. inline configuration;
3. a temporary shadow configuration directory;
4. a localhost protocol translation proxy;
5. as a last resort, a reversible temporary patch with strict restoration safeguards.

The selected harness should behave as if it were configured for that provider only for the launched session. When the session ends, the user's normal harness configuration should remain unchanged.

## 3. Problem statement

### 3.1 Current user pain

A developer may use Claude Code for one workflow, Codex for another, OpenCode for experimentation, and tools such as Pi, Gemini CLI, Kilo Code, or other agentic CLIs. The same developer may access models through Together AI, OpenRouter, Groq, Ollama, LM Studio, vLLM, Fireworks, DeepInfra, a company gateway, or another compatible endpoint.

Today the developer often has to perform some combination of the following for each harness:

- find the harness configuration file;
- back up the current provider settings;
- replace a base URL;
- paste an API key;
- add or rename a provider block;
- change a model identifier;
- select an API protocol;
- restart the harness;
- restore the original configuration after testing;
- troubleshoot unexpected writes made by the harness itself.

This produces four classes of failure.

#### Configuration failure

The user's original setup is overwritten, merged incorrectly, or restored incompletely.

#### Compatibility failure

A provider advertises a familiar API but does not support a parameter, streaming event, tool-call behavior, or error shape expected by the harness.

#### Security failure

Keys are copied into shell history, files, logs, crash reports, or persistent databases unnecessarily.

#### Evaluation failure

Benchmarking becomes unreliable because different harnesses use stale settings, hidden defaults, different model aliases, or different provider policies.

### 3.2 Root cause

The current ecosystem treats a harness-provider combination as a separate configuration problem. That leads to repeated integration work and poor portability.

The architecture should instead separate:

```text
Harness behavior
+ Protocol translation
+ Provider behavior
+ Model capability
```

A new provider should normally require provider metadata and policy, not edits to every harness. A new harness should require one harness adapter and appropriate protocol support, not one integration for every provider.

### 3.3 Why adjacent tools do not fully solve the target problem

Existing categories solve useful parts:

- model gateways centralize provider APIs, but each client still has to be configured to use the gateway;
- provider managers synchronize or write application configurations, which can conflict with a no-mutation promise;
- harness-specific routers adapt one or a few clients;
- TogetherLink already solves valuable per-session launch and protocol translation behavior but is structurally tied to Together AI.

The target product differentiates itself through this exact combination:

- multiple coding harnesses;
- multiple model providers;
- protocol translation where necessary;
- session-only configuration isolation;
- explicit capability validation;
- preservation of existing harness configuration;
- provider destination transparency.

## 4. Product vision

A developer should be able to move between local models, hosted open-source models, private company gateways, and public providers without learning and editing each coding harness's internal configuration.

Long-term vision:

> One predictable launch interface for supported coding harnesses and supported model providers, with transparent compatibility, secure credential handling, and no destructive configuration churn.

## 5. Product positioning

The product is not primarily:

- a model marketplace;
- a hosted inference provider;
- a permanent configuration synchronization tool;
- a replacement for LiteLLM or another general gateway;
- a replacement for the coding harness;
- a desktop account manager;
- a guarantee that every model can emulate every proprietary API feature.

The product is:

> A session-scoped compatibility launcher and runtime adapter for coding harnesses.

A useful product category is:

```text
Universal coding-agent runtime adapter
```

## 6. Product principles

### 6.1 Preserve the user's environment

The user's existing harness configuration is an asset. The product should avoid persistent edits and should be able to report which environment variables, files, ports, processes, and directories it created.

### 6.2 Be explicit about compatibility

The product must not use "works everywhere" as an unconditional promise. It must communicate support for:

- basic text;
- streaming;
- single tool calls;
- parallel tool calls;
- tool-result round trips;
- vision;
- reasoning controls;
- usage accounting;
- context and output limits;
- cancellation;
- cleanup;
- configuration preservation.

### 6.3 Prefer data-driven compatibility

Provider quirks should be represented in provider metadata and versioned policy modules, not scattered through unrelated conditional statements.

### 6.4 Minimize the trusted surface

The initial product should remain a local CLI and local loopback proxy. It should not require a hosted control plane, project account, or transmission of credentials to a project-owned service.

### 6.5 Make runtime behavior inspectable

Before launch, the user should be able to inspect:

- the harness executable path;
- harness version;
- selected provider and model;
- destination base URL and hostname;
- inbound and outbound protocols;
- whether translation is required;
- isolation strategy;
- temporary resources;
- compatibility level;
- warnings, blockers, and known limitations.

### 6.6 Preserve a working regression baseline

Together AI remains the first provider preset and regression baseline while the codebase is generalized. Provider-neutral refactoring must not break current supported TogetherLink behavior.

### 6.7 Fail safely

A failed session must not leave the user's environment in a worse state. The product should prefer refusing an unsafe launch over silently editing configuration or exposing a credential.

### 6.8 Do not silently substitute

The product must not silently change providers or models. Provider-side routing outside the product's control must be identified as such.

## 7. Target users

### 7.1 Primary personas

#### Multi-harness developer

Uses two or more coding agents and switches models or providers frequently. Values low setup time and predictable restoration.

#### Local-model developer

Uses Ollama, LM Studio, vLLM, llama.cpp, or another local endpoint and wants to test models in production-grade coding harnesses without changing normal cloud settings.

#### Model evaluator

Runs comparisons across models and harnesses. Needs deterministic launch configuration, recorded protocol path, and clear capability evidence.

#### Internal developer-platform engineer

Operates a company model gateway and wants developers to use approved endpoints through popular harnesses without distributing separate setup instructions for each harness.

### 7.2 Secondary personas

- open-source model maintainers;
- provider developer-relations teams;
- security-conscious development teams;
- contributors building harness adapters;
- contributors building provider presets and policies;
- teams benchmarking agent harnesses.

## 8. Jobs to be done

1. When I need to test a provider in several coding agents, let me configure it once and launch each agent safely.
2. When I use a local model, let me preserve my normal cloud-agent setup.
3. When a provider is partially compatible, tell me before launch which features may fail.
4. When a session crashes, clean up local proxies and temporary artifacts without damaging unrelated processes or files.
5. When I benchmark models, show exactly which provider, model, protocol path, and policy were used.
6. When I add a custom endpoint, validate connectivity and model availability without exposing the key.
7. When I stop using the product, let me uninstall it without restoring harness configuration backups.
8. When a harness updates and compatibility regresses, tell me which tested version was previously supported.

## 9. Core user stories

### 9.1 Local model through OpenCode

As a developer, I want to launch OpenCode with an Ollama model without editing my OpenCode configuration.

```bash
product run opencode --provider ollama --model qwen-coder
```

### 9.2 Cloud model through Claude Code

As a developer, I want to run Claude Code through OpenRouter without replacing my Anthropic setup.

```bash
product run claude --provider openrouter --model provider/model-id
```

### 9.3 Custom company endpoint through Codex

As a developer, I want to test a private OpenAI-compatible endpoint without creating permanent Codex provider configuration.

```bash
product run codex \
  --base-url https://models.company.example/v1 \
  --api-key-env COMPANY_MODEL_KEY \
  --protocol openai-chat \
  --model company-coder-v2
```

### 9.4 Saved provider reused across harnesses

```bash
product provider add company-ai \
  --base-url https://models.company.example/v1 \
  --api-key-env COMPANY_MODEL_KEY \
  --protocol openai-chat

product run claude --provider company-ai --model company-coder-v2
product run opencode --provider company-ai --model company-coder-v2
```

### 9.5 Configuration-safety proof

As a developer, I want an optional verification report proving which known harness config files changed before and after the session.

## 10. Version 1 scope

### 10.1 Supported harnesses

Version 1 targets:

1. OpenCode
2. Claude Code
3. Codex CLI

Pi may remain in the fork as an existing path, but public support should not be claimed until it passes the same acceptance process.

### 10.2 Supported providers

Version 1 targets:

1. Together AI
2. Ollama
3. OpenRouter
4. Groq
5. Generic OpenAI-compatible endpoint

### 10.3 Supported provider protocols

The initial canonical upstream protocol is OpenAI Chat Completions. Version 1 supports:

- direct OpenAI Chat-compatible providers;
- provider-specific request normalization;
- local no-auth endpoints;
- Anthropic Messages to Chat translation;
- OpenAI Responses to Chat translation.

Native OpenAI Responses, Anthropic Messages providers, and Gemini protocols may be added later.

### 10.4 Supported capabilities

Version 1 includes:

- text generation;
- streaming text;
- basic single tool calls;
- selected parallel-tool support only when tested;
- model selection;
- bearer authentication;
- custom authentication headers;
- no-auth local providers;
- custom non-secret headers and query parameters;
- temporary environment injection;
- inline process configuration;
- localhost translation proxies;
- session cleanup;
- redacted diagnostics;
- provider model discovery where supported;
- compatibility matrix;
- doctor and dry-run commands;
- optional config-integrity verification.

## 11. Explicit non-goals for version 1

Version 1 does not promise:

- every coding harness;
- every provider;
- every model listed by a provider;
- perfect semantic equivalence between API protocols;
- OAuth subscription reuse;
- automatic import of first-party login sessions;
- a hosted control plane;
- a desktop GUI;
- team billing and role management;
- automatic multi-provider load balancing;
- silent fallback between providers;
- provider credential pools;
- exact pricing without a reliable provider source;
- native provider web-search or computer-use tools;
- guaranteed prompt-cache compatibility;
- permanent synchronization of application configs;
- automatic patching of unsupported models to make them tool-capable.

## 12. User experience

### 12.1 Saved provider flow

```bash
product provider add openrouter \
  --base-url https://openrouter.ai/api/v1 \
  --api-key-env OPENROUTER_API_KEY \
  --protocol openai-chat

product run claude \
  --provider openrouter \
  --model provider/model-id
```

The saved profile stores the environment-variable name. The key value is resolved at launch.

### 12.2 Inline provider flow

```bash
product run opencode \
  --base-url http://127.0.0.1:11434/v1 \
  --model qwen-coder \
  --auth none
```

### 12.3 Passthrough arguments

```bash
product run claude \
  --provider openrouter \
  --model provider/model-id \
  -- -p "Fix the failing tests"
```

The product owns arguments before `--`; the harness receives arguments after `--` unchanged.

### 12.4 Dry run

```bash
product run claude \
  --provider openrouter \
  --model provider/model-id \
  --dry-run
```

Dry-run should show:

- harness and executable;
- provider and destination;
- model ID;
- inbound and outbound protocol;
- launch strategy;
- environment variable names with values redacted;
- temporary resources;
- expected persistent changes;
- compatibility level;
- warnings and blockers.

Dry-run must not start the harness or send a provider request.

### 12.5 Doctor

```bash
product doctor --harness claude --provider openrouter --model provider/model-id
```

Doctor checks:

- harness installation and version;
- provider URL syntax;
- credential availability without printing it;
- provider reachability;
- model existence when discoverable;
- local port binding;
- temporary-directory permissions;
- known compatibility policies;
- stale product-owned sessions;
- unsupported capability combinations.

### 12.6 Session banner

At launch, the product should clearly display:

```text
Harness: Claude Code
Provider: OpenRouter
Model: provider/model-id
Route: Anthropic Messages -> local proxy -> OpenAI Chat
Destination: openrouter.ai
Persistent harness config changes: none expected
```

## 13. Success criteria

### 13.1 Functional success

Version 1 is functionally successful when:

- Together AI still works through the provider-neutral architecture;
- OpenCode runs through Ollama without permanent OpenCode config changes;
- OpenCode runs through OpenRouter with streaming and one tool round trip;
- Claude Code completes a coding task through one non-Together provider;
- Codex completes a coding task through one Chat Completions provider using translation;
- invalid credentials, invalid models, unsupported fields, rate limits, timeouts, and context overflow produce understandable errors.

### 13.2 Configuration-safety success

For supported non-mutating paths:

- the product makes no persistent write to normal harness configuration;
- before/after integrity tests pass;
- temporary files are removed or explicitly reported;
- a failed session does not require config restoration.

### 13.3 Security success

- API keys are not logged;
- active API keys are not stored in plaintext persistent databases;
- keys are not written into permanent harness config;
- local proxies bind to loopback;
- local proxy access is session-scoped;
- temporary secret-bearing files use restrictive permissions;
- stale product-owned resources can be cleaned safely.

### 13.4 Compatibility success

The product detects known unsupported combinations before launch when evidence is available.

Example:

```text
Selected model has not passed tool-call tests.
Claude Code depends on tools for normal agent operation.
Compatibility level: 2 (text and streaming only)
Launch blocked unless --allow-degraded is supplied.
```

### 13.5 Public-alpha usability success

A new technical user should be able to:

1. install the product;
2. add one provider profile;
3. run OpenCode through it;
4. inspect dry-run output;
5. understand one compatibility warning;
6. confirm normal config was not changed;
7. clean up a stale session;
8. remove the product without restoring harness files.

## 14. Product metrics

Metrics should initially be local and telemetry should be opt-in.

Useful metrics:

- successful launch rate by harness and provider;
- failure category;
- time from command to harness start;
- percentage of sessions requiring a proxy;
- cleanup success rate;
- config-integrity pass rate;
- compatibility test pass rate;
- number of tested combinations;
- regressions after harness updates;
- doctor remediation success.

The product must not collect prompts, source code, keys, or full request bodies by default.

## 15. Constraints

### 15.1 Technical constraints

- harnesses evolve independently and may change config behavior;
- compatible providers implement different feature subsets;
- translated protocols can lose semantics;
- some harnesses may insist on file-based configuration;
- Windows, macOS, and Linux differ in signals, paths, permissions, and process ownership;
- model tool quality varies even when the API shape is valid.

### 15.2 Product constraints

- compatibility claims must be evidence-based;
- adding a provider should not require editing every harness;
- adding a harness should not require one implementation per provider;
- failure must not leave the user in a worse state;
- safety requirements may limit the number of supported harnesses.

## 16. Open product questions

These questions should be resolved before beta:

1. Should stable version 1 support only environment references, or also OS credential-store integration?
2. Should provider probing be automatic, explicit, or both?
3. How should non-interactive mode handle degraded compatibility?
4. What minimum versions of each harness are supported?
5. Can compatibility policies update independently from the binary, and if so, how are they signed?
6. How are provider-specific aliases presented without hiding exact model IDs?
7. Should session summaries persist by default or be opt-in?
8. What final public name communicates isolated harness-provider bridging rather than only routing?

## 17. Product review checklist

Before a feature enters implementation, reviewers must confirm:

- the user problem is documented;
- the behavior belongs in the current milestone;
- scope and non-goals are clear;
- persistent config impact is understood;
- protocol and capability effects are documented;
- credential and logging behavior is reviewed;
- success and failure paths are testable;
- compatibility documentation can be updated;
- rollback or cleanup behavior is defined.
