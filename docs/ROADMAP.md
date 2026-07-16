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

| Milestone | Goal                               | Proof                                                              |
| --------- | ---------------------------------- | ------------------------------------------------------------------ |
| M0        | Planning and audit                 | critical request, credential, config, and process paths documented |
| M1        | Provider-neutral Together baseline | Together works through generic core                                |
| M2        | Secret-safe runtime                | no active key persisted in plaintext                               |
| M3        | OpenCode + Ollama                  | local model without config mutation                                |
| M4        | OpenCode + OpenRouter              | cloud streaming and tools                                          |
| M5        | Claude generalization              | non-Together coding task completes                                 |
| M6        | Codex generalization               | Responses-to-Chat task completes                                   |
| M7        | Public alpha                       | external user completes quick start                                |
| M8        | Beta hardening                     | cross-platform and full v1 safety                                  |
| M9        | Stable 1.0                         | support policy and evidence-backed compatibility                   |

## 3. M0 - Planning and audit

Deliverables:

- all documents under docs/;
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

Status: **implemented** (2026-07-16) — see `packages/cli/src/lib/provider/` and `docs/audit/09-m1-backlog.md`.

Work:

- [x] ProviderConfig, ProviderAuth, ProviderModel, ProviderCompatibilityPolicy;
- [x] parameterized upstream client;
- [x] provider runtime threaded through CLI, session, daemon, proxy, client;
- [x] Together represented as preset;
- [x] regression tests preserved (`provider-runtime.test.ts` + offline core).

Exit:

- [x] Together is data, not a hard-coded core assumption (defaults still Together);
- [x] baseline offline tests pass;
- [x] no new provider required yet.

M1 complete → **M2 secret-safe runtime landed** (2026-07-16).

## 5. M2 - Secret-safe runtime

Status: **implemented** (2026-07-16) — see `packages/cli/src/lib/daemon/storage.ts`, `app-registration.ts`, and `packages/tests/src/secret-persistence.test.ts`.

Work:

- [x] remove active keys/local tokens from SQLite session rows;
- [x] in-memory secrets only on `SessionState` / proxy options;
- [x] schema epoch `user_version = 2` + scrub/VACUUM of legacy secrets;
- [x] redacted codex-app registration (API key re-resolved from env/config);
- [x] daemon restart seals active rows (no secret resume);
- [x] canary persistence tests;
- [ ] secure temp files (Pi models.json) — track for follow-up / Pi hardening;
- [x] loopback auth unchanged (local-proxy-token file, mode 0600).

Exit:

- [x] canary absent from SQLite and app registration JSON;
- [x] security canary tests pass;
- [x] restart behavior documented (below + audit).

### Daemon restart (normative)

After a daemon process restart, credentialed proxied sessions **cannot** be transparently resumed. Active SQLite rows are sealed (marked ended) with usage totals preserved. Operators must re-launch the harness (or re-run `togetherlink codex-app` with a resolvable `TOGETHER_API_KEY` / global config).

## 6. M3 - OpenCode + Ollama

Status: **implemented** (2026-07-16) — see `packages/cli/src/lib/provider/ollama-*.ts`, `opencode/core.ts`, `harnesses/opencode.ts`.

Why first:

- no cloud key;
- local compatible endpoint;
- inline config;
- direct connection.

Work:

- [x] Ollama preset (`auth: none`, default `http://127.0.0.1:11434/v1`);
- [x] no-auth provider path through OpenCode launch;
- [x] discovery via `/v1/models` with `/api/tags` fallback;
- [x] generic OpenCode provider generation (`@ai-sdk/openai-compatible` + baseURL);
- [x] missing-model / unreachable diagnostics;
- [x] config-integrity: session-only `OPENCODE_CONFIG_CONTENT` (no user config write).

Exit:

- [x] launch path builds valid session-only OpenCode config for Ollama;
- [x] unit tests for discovery + config (live text/stream needs local Ollama + opencode binary);
- [x] normal OpenCode config unchanged (env injection only);
- [ ] optional live level-3 tool gauntlet when Ollama + model available in CI.

### Usage

```bash
togetherlink opencode --provider ollama
togetherlink opencode --provider ollama --main llama3.2
togetherlink --provider ollama --main llama3.2 opencode
```

## 7. M4 - OpenCode + OpenRouter

Status: **implemented** (2026-07-16) — see `packages/cli/src/lib/provider/openrouter-*.ts` and `harnesses/opencode.ts`.

Work:

- [x] bearer auth (`OPENROUTER_API_KEY`);
- [x] provider headers (`HTTP-Referer`, `X-Title`);
- [x] namespaced IDs (`org/model`);
- [x] discovery with curated fallback;
- [x] cloud destination warning on launch;
- [x] auth/rate-limit discovery errors;
- [x] optional pricing from discovery;
- [x] session-only OpenCode config (no permanent write).

Exit:

- [x] unit coverage for preset, discovery, merge, OpenCode config;
- [ ] live text/stream/tool round trip for one model (needs `OPENROUTER_API_KEY` + opencode);
- [x] redaction path inherits M2 (keys not in SQLite);
- [ ] formal compatibility matrix entry (publish with alpha).

### Usage

```bash
export OPENROUTER_API_KEY=sk-or-...
togetherlink opencode --provider openrouter
togetherlink opencode --provider openrouter --main openai/gpt-4o-mini
```

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
