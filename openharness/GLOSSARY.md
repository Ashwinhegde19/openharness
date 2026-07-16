# Glossary

## Agent
A software process that uses a model and tools to perform multi-step tasks. Coding harnesses often operate as agents.

## API key environment reference
The name of an environment variable containing a secret, such as `OPENROUTER_API_KEY`. The reference can be stored without storing the secret value.

## Authentication policy
Rules describing how a provider request is authenticated: bearer token, custom header, query parameter where unavoidable, or no authentication.

## Canonical upstream protocol
The provider-facing protocol chosen as the initial common translation target. Version 1 primarily targets OpenAI Chat Completions.

## Capability
A specific behavior such as basic text, streaming, single tools, parallel tools, vision, reasoning controls, structured output, or usage reporting.

## Coding harness
A CLI or application that orchestrates coding-model context, tools, file access, commands, and agent loops. Version 1 targets OpenCode, Claude Code, and Codex CLI.

## Compatibility level
An evidence-based level from 0 to 5 describing which capabilities work for a specific product, operating system, harness, provider, model, and policy tuple.

## Compatibility policy
Versioned provider-specific rules that normalize request and response differences, such as removing unsupported parameters or selecting a provider endpoint path.

## Config integrity
The property that a user's persistent harness configuration remains unchanged except for explicitly documented and accepted behavior.

## Daemon
A local background process that may manage sessions, proxies, or non-secret persistent metadata.

## Direct launch
A launch where the harness connects directly to a provider through temporary environment or inline configuration, without a protocol translation proxy.

## Dry run
A mode that resolves and displays the launch plan without starting the harness or sending a provider request.

## Harness adapter
A component that detects, validates, plans, and launches one harness using a safe isolation strategy.

## Inbound protocol
The protocol emitted by the harness toward the product or provider.

## Inline configuration
Configuration supplied only to the launched process, commonly through an environment variable or CLI option, instead of a permanent file.

## Isolation strategy
The method used to avoid permanent configuration changes: environment, inline config, shadow config, local proxy, or a last-resort temporary patch.

## Launch context
The fully resolved in-memory input to launch planning, including harness, provider, model, credentials, arguments, environment, and session ID.

## Launch plan
A redacted executable description of how the harness will start, including environment overrides, temporary resources, proxy plan, and compatibility decision.

## Local client token
A random per-session token used by the harness to authenticate to the loopback proxy. It is separate from the upstream provider API key.

## Local protocol proxy
A loopback server that receives the harness's native protocol, translates it, and sends the normalized request to the selected provider.

## Model alias
A friendly or alternate model name that resolves to an exact provider model ID. Aliases must not hide provider-specific differences.

## Model discovery
Retrieval of provider model IDs, usually from a `/models` endpoint or a provider-specific equivalent.

## Non-mutating launch
A launch strategy that does not change the user's persistent harness configuration.

## Outbound protocol
The provider-facing protocol produced after any required translation.

## Passthrough arguments
Arguments after the product's `--` separator that are forwarded to the harness unchanged.

## Provider
A local or remote service accepting model inference requests. It may host first-party models, open-source models, or act as an aggregation gateway.

## Provider adapter
The provider-side configuration and policy defining base URL, authentication, headers, model catalog, and compatibility behavior.

## Provider preset
Built-in public defaults for a provider, excluding secret values.

## Provider profile
A user-defined saved provider configuration, normally storing an API-key environment-variable reference rather than the key value.

## Protocol adapter
A component translating requests, streams, tools, usage, and errors from one API protocol to another.

## Regression baseline
Existing behavior that must continue working during refactoring. Together AI through the TogetherLink baseline is the first regression baseline.

## Request normalization
Provider-specific modification of a canonical request to match supported fields, values, paths, headers, and stream behavior.

## Session
One isolated launch and its owned harness process, proxy, upstream requests, temporary resources, and cleanup state.

## Session-scoped
Existing only for one launch session and not becoming the harness's permanent configuration.

## Shadow configuration
A temporary configuration directory or alternate home used instead of the harness's normal persistent configuration location.

## Stale session
A session record or temporary resource left after abnormal termination and no longer associated with a valid active product process.

## Tool call
A structured model request to invoke a named function or harness tool with arguments.

## Translation loss
A capability or semantic detail that cannot be represented exactly when converting between API protocols.

## Upstream client
The provider-neutral HTTP and streaming client that sends normalized requests to the selected provider.

## Verification state
Whether a compatibility claim is untested, inferred, tested, recommended, or regressed.

## Working title
A temporary development name. It is not the final brand and should not become a technical dependency.
