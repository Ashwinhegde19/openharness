# Project status checklist

**Last updated:** 2026-07-17  
**Branch:** `main` (public: https://github.com/Ashwinhegde19/openharness)  
**Baseline:** TogetherLink fork pin `9f56ed93` (v0.5.26) — implementation baseline only, not product identity.

Use this file to track how far the roadmap has been implemented. Detailed work items live in [ROADMAP.md](./ROADMAP.md).

---

## Milestone summary

| Milestone | Goal                               | Status                                              |
| --------- | ---------------------------------- | --------------------------------------------------- |
| **M0**    | Planning and audit                 | ✅ **Done**                                         |
| **M1**    | Provider-neutral Together baseline | ✅ **Done**                                         |
| **M2**    | Secret-safe runtime                | ✅ **Done** (Pi temp-file secret follow-up open)    |
| **M3**    | OpenCode + Ollama                  | ✅ **Done** (live gauntlet optional)                |
| **M4**    | OpenCode + OpenRouter              | ✅ **Done** (live gauntlet / matrix entry optional) |
| **M5**    | Claude multi-provider              | ✅ **Done** (live evidence / matrix optional)       |
| **M6**    | Codex multi-provider               | ✅ **Done** (live evidence / matrix optional)       |
| **M7**    | Public alpha                       | 🔧 **In progress** ← **current frontier**           |
| **M8**    | Beta hardening                     | ⬜ Not started                                      |
| **M9**    | Stable 1.0                         | ⬜ Not started                                      |

**Progress:** **M0–M6 complete** (implementation + offline tests). **M7 in progress** (packaging, diagnostics, community process landed; alpha gates + external verification remaining).

---

## M0 — Planning and audit ✅

- [x] Product / requirements / architecture / security / compatibility docs
- [x] ADRs 0001–0006
- [x] Diagrams (system, Claude/Codex/OpenCode, session lifecycle)
- [x] Upstream pin + remotes
- [x] Full audit pack under `docs/audit/`
- [x] M1 backlog bounded

---

## M1 — Provider-neutral runtime ✅

- [x] `ProviderConfig` / `ProviderAuth` / `ProviderModel` / `ProviderRuntime`
- [x] Together as data preset
- [x] Compatibility policy stub
- [x] Parameterized upstream chat client (`baseURL`, auth, headers)
- [x] Session/daemon/proxy carry provider runtime
- [x] Offline regression + `provider-runtime.test.ts`

---

## M2 — Secret-safe runtime ✅

- [x] No plaintext `api_key` / `auth_token` in SQLite writes
- [x] Legacy scrub + VACUUM on open
- [x] Daemon restart seals sessions (no secret resume)
- [x] codex-app registration redacts API key; rehydrates from env/config
- [x] Canary tests (`secret-persistence.test.ts`)
- [ ] Pi temp `models.json` / argv secret hardening (follow-up)

---

## M3 — OpenCode + Ollama ✅

- [x] Ollama preset (`auth: none`)
- [x] Model discovery (`/v1/models`, `/api/tags` fallback)
- [x] Session-only `OPENCODE_CONFIG_CONTENT` (no user config write)
- [x] OpenCode defaults to Ollama (no cloud key)
- [x] Unit tests
- [ ] Optional live tool/stream gauntlet in CI

---

## M4 — OpenCode + OpenRouter ✅

- [x] Bearer auth (`OPENROUTER_API_KEY`)
- [x] Attribution headers
- [x] Namespaced model ids + discovery + curated fallback
- [x] Cloud destination warning
- [x] Unit tests
- [ ] Optional live round-trip in CI
- [ ] Formal compatibility matrix entry (alpha)

---

## M5 — Claude multi-provider ✅

- [x] `--provider together|openrouter|ollama`
- [x] Process-only injection (no permanent `~/.claude` mutation)
- [x] Messages→Chat proxy + session provider runtime
- [x] Model alias synthesis for non-Together ids
- [x] Unit tests
- [ ] Optional live coding-task evidence in CI
- [ ] Formal level-3 matrix entry

---

## M6 — Codex multi-provider ✅

- [x] `--provider together|openrouter|ollama`
- [x] Session-local model catalog per provider
- [x] Responses→Chat proxy + session provider runtime
- [x] Unit tests
- [ ] Optional live coding-task evidence in CI
- [ ] Formal level 2/3 matrix entry

---

## M7 — Public alpha ⬜ **In progress**

Work landed for alpha packaging, diagnostics, and community process:

### Product / packaging

- [x] Product name `openharness` — repository and installed CLI binary are `openharness` (provider-neutral fork of TogetherLink)
- [x] Install path + quick start that does **not** require Together (`openharness opencode` → local Ollama)
- [x] Release artifacts: `CHANGELOG.md` added; license reconciled to MIT (matches `LICENSE`); install script reviewed (hosted bundle/origin not yet published for the fork — source build is the alpha install path)

### UX / diagnostics

- [x] `doctor` command — harness detection, Ollama reachability, optional key presence, first-run recommendation
- [x] `dry-run` rendering of launch plan (redacted, no spawn)
- [x] Clear first-run path: OpenCode + Ollama without keys (see README quick start)

### Community / process

- [x] Issue templates (bug / feature / harness+provider support)
- [x] Contribution guide (`CONTRIBUTING.md`)
- [x] Security contact / disclosure notes (`.github/SECURITY.md` + `docs/SECURITY.md`)

### Compatibility / CI

- [x] Machine-readable compatibility matrix (`docs/compatibility-matrix.json`)
- [x] Documented what is unit-tested vs live-tested (see `docs/COMPATIBILITY.md` + matrix `tested` field)
- [ ] Alpha gates from [RELEASE-PLAN.md](./RELEASE-PLAN.md) § Alpha 1 — run by maintainer before tagging alpha

### Exit criteria (from roadmap)

- [ ] External user completes setup without editing harness config (awaiting external tester)
- [ ] Alpha gates pass (see above)
- [ ] No open critical/high on shipped path (true for implemented paths; Pi/ChatGPT alpha carries known limits)

---

## M8 — Beta ⬜ / M9 — Stable 1.0 ⬜

Not started. See [ROADMAP.md](./ROADMAP.md) § M8–M9 and [RELEASE-PLAN.md](./RELEASE-PLAN.md).

---

## Harness × provider matrix (implementation status)

| Harness             | Together                 | Ollama         | OpenRouter | Notes                      |
| ------------------- | ------------------------ | -------------- | ---------- | -------------------------- |
| **OpenCode**        | ✅ `--provider together` | ✅ **default** | ✅         | Session-only config        |
| **Claude Code**     | ✅ **default**           | ✅             | ✅         | Local Anthropic→Chat proxy |
| **Codex**           | ✅ **default**           | ✅             | ✅         | Local Responses→Chat proxy |
| **Pi**              | ✅ only                  | ❌             | ❌         | Post-1.0 / hardening       |
| **ChatGPT Desktop** | ✅ only                  | ❌             | ❌         | Alpha; Together-preset     |

Legend: ✅ launch path implemented (offline unit-tested). Live E2E with real binaries/keys is still optional CI work.

---

## Cross-cutting done outside pure milestones

- [x] Repo public
- [x] No product-level Together API key gate
- [x] Multi-provider optional `configure`
- [x] Offline CI workflow (format / typecheck / unit tests)
- [x] Live gauntlet skips cleanly without `TOGETHER_API_KEY`
- [x] GitHub About description + topics

---

## Known open debt (track before/with M7+)

| Item                                              | Severity | Notes                                                      |
| ------------------------------------------------- | -------- | ---------------------------------------------------------- |
| Pi secret on disk/argv                            | Medium   | M2 follow-up                                               |
| License: `LICENSE` is MIT; `package.json` now MIT | Resolved | Reconciled in M7 (package.json license set to MIT)         |
| Branding `togetherlink` → `openharness`           | Resolved | Renamed in M7 (CLI binary + doctor/README/STATUS branding) |
| Live multi-provider CI evidence                   | Medium   | Needs secrets + harness binaries                           |
| Compatibility matrix not published                | Medium   | Alpha exit                                                 |
| Audit README “important findings” partially stale | Low      | e.g. SQLite secrets fixed in M2                            |

---

## How to update this file

When a milestone item lands:

1. Tick the checkbox here.
2. Keep [ROADMAP.md](./ROADMAP.md) section status in sync.
3. Prefer one atomic `docs:` commit with the status change.
