# Security Design and Threat Model

## 1. Security objective

The product launches coding harnesses that can read source code, execute tools, and transmit prompts to model providers. It therefore sits on a sensitive trust boundary.

Primary security objective:

> Route a user's selected harness session to the explicitly selected provider without unnecessarily persisting credentials, exposing local services, altering unrelated configuration, or obscuring the destination of user data.

## 2. Scope

This threat model covers:

- CLI arguments and environment variables;
- saved provider profiles;
- session manager or daemon;
- local protocol proxies;
- upstream provider HTTP requests;
- temporary files and directories;
- logs, diagnostics, and crash reports;
- harness configuration access;
- executable resolution;
- process lifecycle and cleanup;
- provider-profile import and model discovery.

This design does not claim to secure:

- a malicious coding harness binary intentionally installed by the user;
- a malicious provider explicitly selected by the user;
- a compromised operating-system account;
- source code intentionally sent by the harness to the selected provider;
- provider-side retention or training policies;
- arbitrary commands approved by the user inside the coding harness.

## 3. Assets

### 3.1 High-sensitivity assets

- provider API keys;
- OAuth or bearer tokens if future versions support them;
- local proxy client tokens;
- source code and repository contents;
- prompts and conversation history;
- tool arguments and outputs;
- inherited environment variables;
- private provider URLs and secret query parameters;
- temporary configuration containing credentials.

### 3.2 Medium-sensitivity assets

- local file paths;
- provider and model usage history;
- session history;
- token and cost estimates;
- harness version and operating-system information;
- private but non-secret company endpoint names.

### 3.3 Integrity-critical assets

- existing harness configuration;
- provider profiles;
- compatibility policies;
- executable paths;
- process ownership records;
- schema migrations;
- release artifacts.

## 4. Trust boundaries

```text
User shell
  |
  v
Product CLI
  |---- persistent non-secret profile store
  |---- temporary session directory
  |---- session manager/daemon
  |---- harness process
  |---- loopback proxy
  v
External or local provider boundary
```

Every transition must define:

- data sent;
- credentials available;
- persistence behavior;
- log behavior;
- validation;
- cleanup.

## 5. Threat actors

1. Another local user on the same machine.
2. A malicious or compromised provider endpoint.
3. A malicious imported provider profile.
4. A local process attempting to use the session proxy.
5. A fake harness executable earlier in PATH.
6. Accidental disclosure through shell history or logs.
7. A product bug leaving credentials, ports, or configuration behind.
8. A compromised dependency.
9. A malicious redirect target.
10. An attacker influencing model IDs, headers, or paths through untrusted input.

## 6. Threat analysis and controls

### T-001: API key stored in plaintext persistent storage

**Risk:** A database, profile backup, or generated config exposes active credentials.

**Controls:**

- save environment-variable names by default, not values;
- prohibit active API keys in SQLite session rows;
- prohibit keys in permanent harness configuration;
- scan persistent stores with canary-secret tests;
- migrate away from inherited plaintext fields;
- advise key rotation if an earlier version may have persisted a key.

### T-002: API key exposed through command line

**Risk:** Shell history and process inspection reveal a key.

**Controls:**

- prefer `--api-key-env NAME`;
- support hidden interactive input;
- warn on direct `--api-key VALUE` usage;
- omit secret arguments from session records;
- redact command rendering.

### T-003: API key exposed through logs or errors

**Risk:** Debug output, provider errors, or crash reports contain credentials.

**Controls:**

- central redaction layer;
- case-insensitive redaction of Authorization and known key headers;
- scrub credentials embedded in URLs;
- redact secret query parameters;
- truncate provider error bodies;
- canary tests across logs and snapshots;
- body logging off by default.

### T-004: Another local process uses the loopback proxy

**Risk:** A local process sends requests using the session's upstream credential.

**Controls:**

- bind to loopback only;
- random per-session port;
- random local client token where the harness can send one;
- reject missing or invalid local auth;
- short proxy lifetime;
- bind one proxy session to one resolved provider;
- do not expose arbitrary forwarding destinations;
- rate-limit failed local-auth attempts.

### T-005: Proxy binds publicly

**Risk:** Network users access a credentialed proxy.

**Controls:**

- hard default to `127.0.0.1` and optionally `::1`;
- no wildcard binding in the initial stable design;
- external binding requires a separate security ADR;
- verify and display resolved listener addresses.

### T-006: Redirect leaks authorization

**Risk:** An authenticated endpoint redirects to another host.

**Controls:**

- disable redirects or allow same-origin redirects only;
- never forward authorization to a different origin automatically;
- log blocked destination without credentials;
- require an explicit trusted redirect policy for exceptions.

### T-007: Header injection

**Risk:** A malicious profile inserts new headers or corrupts a request.

**Controls:**

- reject CR and LF;
- validate header names against HTTP token syntax;
- reserve Host, Content-Length, Transfer-Encoding, and connection-management headers;
- deterministic header precedence;
- secret-header classification and redaction.

### T-008: Shell injection

**Risk:** Model IDs, URLs, or passthrough arguments are interpolated into shell commands.

**Controls:**

- use process spawning with argument arrays;
- avoid shell execution;
- pass passthrough arguments as independent entries;
- test quotes, semicolons, newlines, spaces, Unicode, and values beginning with dashes.

### T-009: Fake harness executable

**Risk:** The wrong binary is resolved through PATH.

**Controls:**

- display resolved executable in dry-run;
- allow pinned executable paths;
- collect and show version output;
- warn if executable directory is world-writable or otherwise suspicious where detectable;
- never download and run a harness silently.

### T-010: Temporary file readable by another user

**Risk:** A temporary file contains a key or local token.

**Controls:**

- avoid secret-bearing files where possible;
- create unpredictable owner-only temporary directories;
- use owner-only file permissions where supported;
- remove secret files immediately after use where possible;
- use OS-secure temporary APIs;
- do not expose paths in broad logs.

### T-011: Incomplete cleanup after crash

**Risk:** A proxy, port, token file, or temporary config remains.

**Controls:**

- non-secret ownership marker;
- startup scan for stale product-owned sessions;
- idempotent cleanup command;
- bounded retention of secret-bearing files;
- process ownership verification;
- crash tests on supported platforms;
- never terminate an unknown process occupying a stale port.

### T-012: Restoration overwrites user changes

**Risk:** A last-resort config patch restores an old backup over edits made during the session.

**Controls:**

- avoid patching by default;
- lock the file where possible;
- hash original and product-written content;
- restore only when current content exactly matches the product-written version;
- otherwise stop and produce recovery instructions;
- never silently overwrite concurrent changes.

### T-013: Data sent to an unexpected provider

**Risk:** The user believes a session is local or uses one provider, but data is sent elsewhere.

**Controls:**

- display provider hostname before launch;
- label local, private, and public destinations;
- require confirmation on first use of an imported custom remote endpoint;
- no silent failover;
- include provider/model in the startup banner;
- record requested and resolved provider/model IDs.

### T-014: Prompt or source code stored in diagnostics

**Risk:** Sensitive code persists locally or enters telemetry.

**Controls:**

- no body logging by default;
- aggregate metadata only by default;
- telemetry opt-in;
- documented retention and deletion;
- crash reports exclude prompts and source code;
- unsafe body logging requires a separate explicit option.

### T-015: Silent model substitution

**Risk:** Product policy routes to a different model without user knowledge.

**Controls:**

- policy cannot rewrite model ID unless explicit user mapping exists;
- log requested and resolved model IDs;
- surface provider-returned model metadata when available;
- identify provider-side routing as outside product control;
- do not claim model identity verification without evidence.

### T-016: Custom endpoint targets sensitive network locations

**Risk:** A custom base URL reaches cloud metadata or sensitive internal services.

**Controls:**

- classify loopback, private, link-local, and public addresses;
- warn on link-local and metadata ranges;
- never fetch arbitrary provider-returned URLs with credentials;
- future managed deployments must use allowlists and block metadata ranges.

### T-017: Untrusted profile executes code

**Risk:** A provider profile includes hooks or executable commands.

**Controls:**

- provider profiles are pure data;
- no arbitrary shell fields;
- strict runtime schema;
- reject unknown executable fields;
- imported profiles require destination review.

### T-018: Oversized or malformed stream exhausts memory

**Risk:** Provider response causes memory exhaustion or parser failure.

**Controls:**

- bounded line/event sizes;
- bounded accumulated tool arguments;
- streaming parser limits;
- response-size limits;
- timeouts;
- typed failure instead of process crash;
- backpressure support.

### T-019: Cleanup kills an unrelated process

**Risk:** PID reuse or port reuse causes destructive cleanup.

**Controls:**

- retain process handles where possible;
- verify creation time or parent relationship;
- never kill based only on PID from stale persistent metadata;
- never kill based only on executable name or port;
- report ambiguous ownership for manual review.

### T-020: Dependency compromise

**Risk:** A dependency handling streams, spawning, configs, or publishing is compromised.

**Controls:**

- lock dependencies;
- automated vulnerability scanning;
- minimize runtime dependencies;
- review high-trust packages;
- protected package publishing;
- checksums and signed provenance where practical;
- software bill of materials for stable releases where feasible.

## 7. Credential lifecycle

### 7.1 Acquisition

Allowed sources:

- environment variable;
- hidden interactive prompt;
- future OS credential store approved by ADR.

Discouraged source:

- direct command-line value.

### 7.2 Resolution

The product resolves the credential after launch planning and before the first provider validation or request.

A missing required environment variable produces a typed error naming the variable, never its expected value.

### 7.3 In-memory handling

- pass secrets only to the upstream client or secure adapter path;
- exclude secrets from serializable LaunchPlan representations;
- do not include secrets in daemon persistent messages;
- release references after session end where practical;
- recognize that garbage-collected runtimes cannot guarantee physical zeroization.

### 7.4 Persistence

Default profile:

```json
{
  "apiKeyEnv": "OPENROUTER_API_KEY"
}
```

Forbidden default profile:

```json
{
  "apiKey": "actual-secret"
}
```

### 7.5 Rotation guidance

Documentation must advise credential rotation if:

- a key was supplied directly on the command line;
- a previous version persisted it;
- unsafe debug logs were enabled;
- a redirect may have exposed it;
- the machine or profile store was compromised.

## 8. Local proxy security

### 8.1 Binding

- loopback only;
- dynamic port;
- readiness check before harness start;
- port closed immediately after session.

### 8.2 Authentication

- random per-session token;
- constant-time comparison where practical;
- no token in logs;
- local auth failure returns a generic response;
- token not reused.

### 8.3 Destination binding

A proxy instance is created with one resolved provider base URL and cannot accept arbitrary destination URLs from the harness request.

### 8.4 Request controls

- accepted methods and paths are allowlisted;
- body size is bounded;
- content type is validated;
- unsupported paths are rejected;
- health endpoint exposes no secret or provider details.

## 9. Provider profile security

Profiles may reveal private endpoints and should use user-only permissions even when they contain no key values.

Profile import must:

- validate schema;
- show provider destination;
- identify secret header references;
- reject embedded code;
- avoid automatic paid probes;
- preserve exact model IDs;
- mark untested compatibility honestly.

## 10. Logging policy

### 10.1 Default logs may contain

- timestamps;
- session and request IDs;
- harness/provider/model identifiers;
- protocol path;
- status category;
- latency;
- token usage where available;
- cleanup status.

### 10.2 Default logs must not contain

- API keys or local tokens;
- authorization values;
- prompts or source code;
- full request/response bodies;
- complete tool arguments;
- full environment dumps;
- private headers.

### 10.3 Canary redaction testing

Inject unique secrets into:

- bearer headers;
- custom headers;
- URLs;
- query parameters;
- CLI arguments;
- environment variables;
- nested JSON;
- provider error bodies.

No canary may appear in persistent logs, snapshots, databases, or cleaned temporary paths.

## 11. Configuration mutation policy

Supported paths should be non-mutating.

A temporary patch path requires:

- explicit adapter documentation;
- user warning;
- original hash;
- exact product-written hash;
- backup with restrictive permissions;
- conflict-safe restoration;
- crash recovery;
- integrity tests;
- separate support classification.

## 12. Security testing

Required tests include:

- canary-secret redaction;
- database scanning for secrets;
- temporary permission checks;
- loopback-only binding;
- unauthorized local proxy rejection;
- cross-origin redirect rejection;
- CRLF injection rejection;
- shell metacharacter argument handling;
- imported-profile schema rejection;
- stale-session cleanup;
- PID and port reuse safety;
- config restoration conflict handling;
- malformed and oversized streams;
- cancellation and timeouts;
- body-size limits;
- concurrent session isolation.

## 13. Vulnerability severity

### Critical

- remote unauthenticated access to a credentialed proxy;
- arbitrary command execution;
- credential exfiltration to an unrelated host;
- destructive overwrite of source or harness configuration.

### High

- plaintext persistent key storage in a default path;
- reliable cross-user local credential use;
- secret logging by default;
- cleanup killing unrelated processes.

### Medium

- private endpoint disclosure;
- stale sensitive metadata retention;
- local-user denial of service;
- inaccurate destination display without credential exposure.

### Low

- inaccurate non-sensitive metadata;
- cosmetic warning failures without security effect.

## 14. Incident response

The project must publish a private security contact before public alpha.

Procedure:

1. acknowledge privately;
2. reproduce and assign severity;
3. stop affected distribution if necessary;
4. patch or disable the affected path;
5. prepare migration, cleanup, and credential-rotation guidance;
6. publish an advisory after an update path exists;
7. add regression tests;
8. update this threat model and relevant ADRs.

## 15. Security review gates

Security review is required for changes involving:

- credential storage or retrieval;
- proxy binding or authentication;
- redirects;
- config patching;
- executable discovery;
- logging or telemetry;
- temporary files;
- daemon persistence;
- remote management APIs;
- imported profiles;
- plugins or executable extensions;
- package publishing.
