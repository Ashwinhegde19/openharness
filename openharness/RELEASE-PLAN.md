# Release Plan

## 1. Release philosophy

The project should release in small, evidence-backed stages. A release is defined by supported combinations and safety guarantees, not by the number of provider presets.

The project must avoid a broad "universal" stable claim before compatibility, credential handling, and cleanup are proven.

## 2. Versioning

Use semantic versioning after public package publication.

Suggested sequence:

```text
0.1.0-alpha.1
0.1.0-alpha.2
0.2.0-beta.1
0.2.0-beta.2
0.3.0-rc.1
1.0.0
```

Before 1.0, breaking CLI or profile changes require release notes and migration guidance.

## 3. Release channels

### Development snapshots

- built from selected commits;
- no support guarantee;
- intended for contributors and automated testing.

### Alpha

- validates architecture and user flow;
- limited tested matrix;
- known limitations expected;
- persistent formats may change.

### Beta

- all version 1 harnesses included;
- security and cleanup substantially complete;
- migrations supported;
- compatibility documentation reliable.

### Release candidate

- feature freeze except critical fixes;
- installation, upgrade, rollback, security, and documentation verification;
- candidate may become stable without code changes.

### Stable

- support window;
- controlled breaking changes;
- migration policy;
- vulnerability process;
- audited compatibility claims.

## 4. Alpha 1

### Included

- provider-neutral types;
- Together AI as a provider preset;
- generic upstream client;
- provider runtime threaded through sessions and proxies;
- no plaintext active key persistence in the new path;
- OpenCode plus Ollama proof;
- dry-run;
- initial doctor;
- configuration-integrity utility.

### Excluded

- full Codex support;
- broad model catalog;
- GUI;
- encrypted secret storage;
- remote policy updates.

### Exit criteria

- Together regression passes;
- OpenCode uses Ollama without permanent config changes;
- database/log scans contain no canary key;
- Linux smoke test passes;
- architecture/security docs match implementation.

## 5. Alpha 2

### Included

- OpenRouter preset;
- generic OpenAI-compatible profile;
- custom headers;
- model discovery;
- tool-call contract;
- stale-session cleanup.

### Exit criteria

- OpenCode plus OpenRouter reaches level 3 for one model;
- provider error mapping passes;
- redaction suite passes;
- macOS/Windows installation status is documented and smoke-tested where claimed.

## 6. Alpha 3

### Included

- provider-neutral Claude adapter;
- Anthropic-to-Chat contract suite;
- one non-Together end-to-end task;
- compatibility warnings for degraded tools/vision/reasoning.

### Exit criteria

- Claude Code completes a standard tool-based task through one non-Together provider;
- config integrity passes;
- cancellation and crash cleanup pass;
- no unresolved critical/high issue in the shipped path.

## 7. Beta 1

### Included

- Codex Responses-to-Chat adapter;
- all version 1 provider categories;
- machine-readable matrix;
- policy versioning;
- profile/session migrations;
- cross-platform cleanup.

### Exit criteria

- OpenCode, Claude Code, and Codex complete the standard task suite through at least one non-first-party provider;
- protocol contracts pass;
- installation/uninstall docs complete;
- stale recovery passes on supported platforms.

## 8. Beta 2

### Included

- reliability fixes;
- broader tested models;
- performance baseline;
- artifact checksums/signing where practical;
- security reporting process;
- support policy draft.

### Exit criteria

- no known critical issues;
- high issues resolved or release-blocked;
- migration and rollback tested;
- compatibility claims audited;
- external user completes quick start without maintainer intervention.

## 9. Release candidate

RC begins when:

- version 1 scope is complete;
- public CLI is stable;
- schema migrations are final;
- docs are reviewed;
- dependency audit is acceptable.

RC validation:

- clean install;
- upgrade from latest beta;
- rollback with documented limitations;
- uninstall without deleting unrelated harness data;
- config-integrity verification;
- security scan;
- artifact checksum verification;
- compatibility suite on declared platforms.

## 10. Stable 1.0 gate

Stable requires:

1. normative version 1 MUST requirements implemented or formally revised;
2. no plaintext active API key persistence;
3. loopback proxy authentication and binding reviewed;
4. all three initial harnesses supported at documented levels;
5. Together, Ollama, OpenRouter, Groq, and custom compatible paths documented;
6. matrix tied to evidence;
7. provider profile and database migration strategy;
8. accepted crash cleanup reliability;
9. security contact and disclosure process;
10. support and deprecation policies;
11. license and TogetherLink attribution verified;
12. known limitations in release notes;
13. at least one RC cycle.

## 11. Rollback

### Application rollback

A previous product version can be installed without restoring harness configuration because supported paths do not mutate it.

### Profile rollback

Before a non-backward-compatible migration:

- back up non-secret profile data;
- exclude resolved secrets;
- document downgrade limitations;
- support export to a stable textual format.

### Database rollback

Prefer additive migrations. Destructive migrations require backup, verification, and release notes.

## 12. Release artifacts

Potential artifacts:

- CLI package;
- source archive;
- checksums;
- changelog;
- compatibility report;
- migration notes;
- SBOM where practical;
- provenance/signature where practical.

## 13. Release notes template

```text
Version and date
Summary
Supported harness versions
New tested providers/models
Compatibility changes
Security changes
Schema migrations
Breaking changes
Known limitations
Upgrade steps
Rollback steps
Artifacts/checksums
Contributors
```

## 14. Support policy

Before 1.0, support focuses on the current alpha or beta line.

After 1.0 define:

- supported current minor line;
- security-fix window;
- minimum harness versions;
- operating-system matrix;
- provider deprecation process;
- re-test expiry for compatibility entries.

## 15. Deprecation

A harness, provider, protocol, or option may be deprecated when:

- upstream behavior is no longer maintainable;
- secure isolation is impossible;
- maintenance cost greatly exceeds usage;
- a replacement exists.

Deprecation includes a warning period, migration path, final supported version, matrix update, and release-note notice.

## 16. Emergency release

Emergency criteria:

- credential exposure;
- remotely exposed proxy;
- arbitrary command execution;
- destructive config/source overwrite;
- cleanup killing unrelated processes.

Procedure:

1. freeze affected distribution if needed;
2. patch or disable affected feature;
3. publish cleanup/rotation guidance;
4. add regression tests;
5. publish advisory.
