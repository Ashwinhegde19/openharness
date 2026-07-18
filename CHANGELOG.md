# Changelog

All notable changes to the CLI are recorded here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the version is the single
source of truth in the root `package.json`.

The repository and installed CLI binary are **openharness** — a provider-neutral
fork of [TogetherLink](https://github.com/Nutlope/openharness). The binary was
renamed from `openharness` to `openharness` during M7.

## [0.1.0-alpha.1] — 2026-07-17 (public alpha · M7 in progress)

> Version scheme adopted for the openharness fork: `0.1.0-alpha.1` follows the
> alpha sequence in `docs/RELEASE-PLAN.md` § 2. The previous `0.5.26` was
> TogetherLink's upstream pin and is no longer the product version.

## [0.5.26] — 2026-07-17 (public alpha · M7 in progress)

### Added

- `doctor` command: detects installed harnesses, checks Ollama reachability,
  reports optional provider key presence (no secret exposure), and prints a
  first-run recommendation.
- `dry-run <harness> [flags]` command: resolves and prints the redacted launch
  plan without spawning the harness binary.
- Machine-readable compatibility matrix (`docs/compatibility-matrix.json`).
- GitHub issue templates, `CONTRIBUTING.md`, and `.github/SECURITY.md`
  (private vulnerability reporting path).

### Notes

- OpenCode defaults to local **Ollama** (no API key). Together and OpenRouter are
  opt-in via `--provider together` / `--provider openrouter`.
- No product-level API key is required to run the CLI or OpenCode.
- Offline unit tests are the default CI gate. Live E2E (real provider calls /
  harness binaries) is optional and skips cleanly without keys.
- The one-line `curl … | sh` installer and hosted bundle are not yet published
  for this fork. The supported alpha install path is the source build — see the
  README "Quick start".

### Security

- Pi harness: the temporary `models.json` (carries the Together API key for the
  launched process) is now written with `0600` permissions instead of the
  default (world-readable) mode. The temp dir is removed on exit. The
  `--api-key` value is still passed on argv; switching Pi to env-only auth
  (`TOGETHER_API_KEY`) is tracked as follow-up.

### Docs / tooling

- The machine-readable compatibility matrix is now **published**: it is
  validated in CI (`pnpm matrix:validate`) and rendered to a human-readable
  `docs/compatibility-matrix.md` (`pnpm matrix:render`). Editing the JSON and
  re-running render keeps the two in sync.

### Baseline

Forked from TogetherLink at pin `9f56ed93` (v0.5.26). Milestones M0–M6
(provider-neutral runtime, secret-safe runtime, OpenCode+Ollama,
OpenCode+OpenRouter, Claude multi-provider, Codex multi-provider) were completed
before the public-alpha milestone.
