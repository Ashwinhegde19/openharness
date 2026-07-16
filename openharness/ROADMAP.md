# Roadmap

## 1. Principles

- Architecture before breadth.
- Safety before convenience.
- One proven combination before many presets.
- Preserve Together regression.
- Add providers independently from harnesses.
- Add harnesses through acceptance criteria.
- Rename branding after provider neutrality works.

## 2. Milestones

| Milestone | Goal | Proof |
|---|---|---|
| M0 | Planning and audit | critical request, credential, config, and process paths documented |
| M1 | Provider-neutral Together baseline | Together works through generic core |
| M2 | Secret-safe runtime | no active key persisted in plaintext |
| M3 | OpenCode + Ollama | local model without config mutation |
| M4 | OpenCode + OpenRouter | cloud streaming and tools |
| M5 | Claude generalization | non-Together coding task completes |
| M6 | Codex generalization | Responses-to-Chat task completes |
| M7 | Public alpha | external user completes quick start |
| M8 | Beta hardening | cross-platform and full v1 safety |
| M9 | Stable 1.0 | support policy and evidence-backed compatibility |

## 3. M0 - Planning and audit

Deliverables:

- all documents in this folder;
- exact upstream commit;
- license review;
- package/dependency map;
- Together reference inventory;
- credential flow;
- process/session flow;
- persistence classification;
- baseline test report;
- implementation issue backlog.

Exit:

- scope/non-goals approved;
- provider/model/harness/session schemas agreed;
- credential policy agreed;
- current assumptions mapped;
- first implementation PR is bounded.

## 4. M1 - Provider-neutral Together

Work:

- ProviderConfig, ProviderAuth, ProviderModel, ProviderCompatibilityPolicy;
- parameterized upstream client;
- provider runtime threaded through CLI, session, daemon, proxy, client;
- Together represented as preset;
- regression tests preserved.

Exit:

- Together is data, not a hard-coded core assumption;
- baseline tests pass;
- no new provider required yet.

## 5. M2 - Secret-safe runtime

Work:

- remove active keys/local tokens from persistent storage;
- in-memory secret structure;
- schema migration;
- redaction;
- secure temp files;
- loopback auth;
- stale-session behavior.

Exit:

- canary absent from databases, logs, config, and cleaned temp paths;
- security tests pass;
- restart behavior documented.

## 6. M3 - OpenCode + Ollama

Why first:

- no cloud key;
- local compatible endpoint;
- inline config;
- direct connection.

Work:

- Ollama preset;
- no-auth provider;
- discovery;
- generic OpenCode provider generation;
- missing-model diagnostics;
- config-integrity test.

Exit:

- launch succeeds;
- text/stream pass;
- tool-capable model reaches level 3 where feasible;
- normal OpenCode config unchanged.

## 7. M4 - OpenCode + OpenRouter

Work:

- bearer auth;
- provider headers;
- namespaced IDs;
- discovery fallback;
- cloud destination warning;
- auth/rate errors;
- optional pricing.

Exit:

- text, stream, and tool round trip pass for one model;
- redaction passes;
- compatibility entry published.

## 8. M5 - Claude generalization

Work:

- provider-neutral proxy options;
- Messages-to-Chat translation;
- stream/tool mapping;
- context/auth errors;
- process-only injection;
- lifecycle/cancellation.

Exit:

- standard coding task through non-Together provider;
- config unchanged;
- crash cleanup passes;
- level 3 evidence published.

## 9. M6 - Codex generalization

Work:

- isolated Codex plan;
- Responses-to-Chat translation;
- tool mapping;
- unsupported Responses features;
- model selection;
- cleanup/integrity.

Exit:

- standard coding task through Chat provider;
- loss behavior explicit;
- level 2 or 3 based on evidence.

## 10. M7 - Public alpha

Work:

- temporary publishable product name;
- installation and quick start;
- doctor/dry-run polish;
- issue templates;
- contribution guide;
- matrix automation;
- security contact;
- release artifacts.

Exit:

- external user completes setup without editing config;
- alpha gates pass;
- no critical/high unresolved issue.

## 11. M8 - Beta hardening

Work:

- Linux/macOS/Windows;
- Groq policy;
- custom endpoint UX;
- migrations;
- performance baseline;
- stale cleanup reliability;
- broader models;
- dependency security;
- rollback.

Exit:

- beta gates pass;
- claims audited;
- profile format stabilizes.

## 12. M9 - Stable

Work:

- support/deprecation policies;
- RC cycle;
- vulnerability process;
- final license review;
- stable CLI/schema;
- documentation audit.

## 13. Post-1.0 candidates

Not commitments:

- Gemini CLI;
- Pi;
- Kilo Code and additional harnesses;
- native Anthropic providers;
- native Responses providers;
- native Gemini protocol;
- OS credential stores;
- optional desktop UI;
- explicit fallback policies;
- team profiles;
- signed policy updates;
- benchmark mode;
- private remote gateway deployment.

## 14. Issue structure

Each milestone contains design, implementation, tests, security, docs, and release/demo issues.

Each implementation issue includes:

- linked requirements;
- scope/non-goals;
- trust boundaries;
- acceptance tests;
- config effects;
- rollback/cleanup.

## 15. Initial issues

1. Audit Together-specific imports/constants/names.
2. Audit SQLite and key persistence.
3. Define ProviderConfig schema.
4. Define ProviderModel schema.
5. Define HarnessAdapter and LaunchPlan.
6. Define compatibility-policy schema.
7. Generalize upstream client.
8. Thread provider runtime through sessions.
9. Add canary persistence test.
10. Add config snapshot utility.
11. Convert Together to preset.
12. Add Ollama/no-auth.
13. Generalize OpenCode config generation.
14. Add OpenRouter preset.
15. Add Anthropic-to-Chat fixtures.
16. Generalize Claude proxy.
17. Add Responses-to-Chat fixtures.
18. Generalize Codex proxy.
19. Implement doctor.
20. Implement dry-run rendering.
21. Publish machine-readable matrix.
22. Rename branding after M6 or later.
