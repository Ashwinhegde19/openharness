# Test Strategy

## 1. Objectives

Testing must prove more than successful HTTP responses. It must prove:

- provider-neutral behavior preserves Together regression;
- configuration remains intact;
- credentials do not persist or leak;
- translations preserve required agent semantics;
- streaming and tools behave correctly;
- cleanup is safe under normal and abnormal termination;
- compatibility claims are reproducible.

## 2. Test pyramid

```text
                Live end-to-end tests
             Cross-platform smoke tests
          Harness/provider integration tests
       Protocol/provider contract tests
    Unit, schema, security, property tests
```

Live provider tests must not replace deterministic mocks and fixtures.

## 3. Environments

### CI

- Linux current LTS runner
- macOS current runner
- Windows current runner
- supported Node/runtime versions

A harness/platform pair remains experimental until the actual harness can be installed and smoke-tested there.

### Local development

Developers must be able to run:

- unit tests without provider keys;
- protocol contracts without network access;
- mock integrations without every harness installed;
- optional live tests through environment-variable credentials.

## 4. Unit tests

### Configuration

- profile parsing and validation;
- precedence;
- URL normalization;
- environment key resolution;
- no-auth providers;
- custom headers and query parameters;
- model aliases;
- unknown capability preservation;
- schema migrations.

### CLI

- harness-first syntax;
- provider flags;
- inline endpoint values;
- `--` passthrough;
- spaces and Unicode;
- values beginning with dashes;
- missing and conflicting flags;
- non-interactive behavior.

### Compatibility evaluator

- level selection;
- blocker versus warning;
- tool-required harness with tool-disabled model;
- inferred versus tested;
- policy version selection;
- degraded launch behavior.

### Security helpers

- bearer and custom-header redaction;
- URL/query redaction;
- nested JSON redaction;
- CRLF rejection;
- secure temporary path creation;
- redirect-origin checks.

### Session manager

- state transitions;
- ownership records;
- dynamic port allocation;
- idempotent cleanup;
- stale detection;
- partial-start cleanup;
- concurrent isolation.

## 5. Protocol contract tests

All translations use fixed fixtures and deterministic event streams.

### Anthropic Messages to OpenAI Chat

Test:

1. system and user messages;
2. multiple system blocks;
3. assistant text;
4. tool definitions;
5. tool use;
6. tool result;
7. mixed text/tool blocks;
8. stop sequences;
9. output-token field;
10. cancellation;
11. context error;
12. auth error;
13. malformed tool call;
14. text streaming;
15. tool-argument fragments;
16. multiple tool calls;
17. usage mapping;
18. missing usage;
19. terminal-event uniqueness;
20. unsupported image behavior.

### OpenAI Responses to OpenAI Chat

Test:

1. string input;
2. structured messages;
3. instructions/system mapping;
4. tool definitions;
5. tool call/result;
6. output-text streaming;
7. tool-argument streaming;
8. completion status;
9. reasoning downgrade;
10. unsupported Responses-only features;
11. error mapping;
12. cancellation;
13. usage mapping;
14. event ordering.

### Chat passthrough

Test:

- unchanged request except policy;
- streaming forwarding;
- usage;
- errors;
- retries;
- headers/query parameters;
- redirect behavior;
- model preservation.

## 6. Mock provider server

The deterministic mock must simulate:

- normal response;
- normal stream;
- delayed first token;
- partial stream then disconnect;
- malformed SSE;
- single tool call;
- parallel tools;
- invalid tool JSON;
- 401/403;
- 404 model/endpoint;
- 400 unsupported field;
- 429 with and without retry headers;
- 500/503;
- context-limit error;
- missing usage;
- same-origin redirect;
- cross-origin redirect;
- oversized response;
- timeout;
- compressed response edge cases.

It records only redacted metadata needed for assertions.

## 7. Harness adapter tests

### OpenCode

- executable/version detection;
- valid inline provider config;
- no permanent config write;
- provider/model passed correctly;
- passthrough args preserved;
- no-auth local endpoint;
- key environment reference;
- resolved executable shown in dry-run;
- cleanup after normal and failed launch.

### Claude Code

- process-only loopback base URL;
- local proxy authentication;
- normal Claude config unchanged;
- proxy readiness before launch;
- proxy shutdown after exit;
- Ctrl+C;
- harness crash;
- provider auth and context errors;
- tool round trip.

### Codex

- isolated runtime configuration;
- normal Codex config unchanged;
- Responses routed to proxy;
- selected model preserved;
- temporary resources removed;
- passthrough behavior;
- unsupported Responses feature handling;
- tool round trip.

## 8. Configuration-integrity tests

### Method

1. Create realistic harness config fixtures.
2. Record paths, types, hashes, permissions, and symlink targets.
3. Run a session against the mock provider.
4. Record again.
5. Compare against an expected-change allowlist, ideally empty.

### Cases

- normal exit;
- Ctrl+C;
- proxy failure;
- harness startup failure;
- parent termination;
- concurrent user edit;
- read-only normal config;
- symlinked config;
- spaces and Unicode in home path.

Any unexpected persistent change fails.

## 9. Credential-persistence tests

Use unique canary secrets and scan:

- SQLite databases;
- JSON/TOML/YAML profiles;
- harness config directories;
- temporary directories after cleanup;
- logs;
- crash reports;
- generated command renderings;
- process arguments where testable.

The canary must not appear outside the controlled parent test environment.

## 10. Streaming tests

Assert:

- prompt first delta forwarding;
- event ordering;
- UTF-8 split handling;
- tool JSON assembly;
- exactly one terminal event;
- cancellation closes upstream;
- client disconnect does not leak request lifetime;
- malformed events create typed errors;
- backpressure prevents unbounded buffering;
- line and accumulated argument limits work.

## 11. Tool-call tests

### Single tool

- schema received correctly;
- call ID preserved or mapped safely;
- arguments valid JSON;
- result associated with correct call;
- final answer follows result.

### Parallel tools

- IDs remain distinct;
- interleaved fragments assemble correctly;
- result ordering is supported or explicitly normalized;
- unsupported provider blocks or warns.

### Malformed tools

- invalid JSON;
- missing call ID;
- unknown tool;
- duplicate ID;
- oversized arguments;
- partial stream termination.

## 12. Error and retry tests

Verify:

- auth failures are not retried;
- invalid models are not retried;
- safe unsupported-field normalization may retry once;
- 429 uses bounded policy;
- cancellation stops retries;
- boundary is identified;
- provider body is truncated/redacted;
- timeout is distinguishable from cancellation;
- retry does not duplicate completed tool events.

## 13. Crash and cleanup tests

Scenarios:

1. SIGINT/platform equivalent.
2. termination signal.
3. harness unexpected exit.
4. proxy crash.
5. parent terminal closure.
6. restart with stale record.
7. cleanup twice.
8. stale port reused by another process.
9. PID reused by another process.
10. two concurrent sessions.

Assert:

- unrelated processes survive;
- owned processes stop;
- port releases;
- secret file disappears;
- session becomes closed/stale appropriately;
- next launch works;
- ambiguous ownership is reported, not force-killed.

## 14. Live provider tests

Live tests are opt-in, use environment variables, and have spending limits.

### Together AI

- baseline text;
- stream;
- tool call;
- known model;
- regression against baseline.

### OpenRouter

- required headers;
- namespaced model ID;
- stream;
- tool call;
- usage behavior;
- one translated Claude or Codex session.

### Groq

- unsupported-field normalization;
- streaming;
- supported tool model;
- error mapping.

### Ollama

- no-auth loopback;
- discovery;
- stream;
- tool-capable model;
- missing model remediation.

## 15. End-to-end task suite

Recommended deterministic tasks:

1. inspect a small repository and explain structure;
2. change one function and run tests;
3. read a file through a tool;
4. perform sequential tool calls;
5. recover from one failing test;
6. handle context warning;
7. cancel a long response;
8. operate in a path containing spaces.

Test repositories must be synthetic or clearly licensed.

## 16. Performance tests

Measure:

- launch overhead;
- proxy median/p95 processing overhead;
- time to first forwarded token;
- memory during large streams;
- memory during large tool arguments;
- cleanup time;
- concurrent sessions.

Thresholds should be set after a stable baseline exists.

## 17. Fuzz and property tests

Targets:

- SSE parser;
- content-block ordering;
- tool fragment assembly;
- headers;
- URLs;
- CLI parser;
- redaction;
- session transitions.

Properties:

- redaction never returns the exact canary;
- cleanup twice has the same final state;
- translation never emits two terminal events;
- unknown fields cannot become auth headers;
- policy never changes model ID silently;
- one session cleanup cannot remove another session's resources.

## 18. Test data policy

Fixtures must not contain real credentials, private source code, or proprietary conversations. Use synthetic data and canary secrets.

## 19. Release test report

Each release candidate report includes:

- commit/version;
- suite version;
- operating systems;
- harness versions;
- provider/model combinations;
- compatibility levels;
- failures and waivers;
- security scan summary;
- config-integrity result;
- upgrade/rollback result;
- known limitations.

## 20. Definition of done

A feature is done only when:

- unit tests pass;
- relevant contract tests exist;
- config impact is tested;
- secret handling is tested;
- failure and cleanup paths are tested;
- docs and compatibility entries are updated;
- live evidence exists for public compatibility claims.
