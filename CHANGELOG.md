# Changelog

All notable changes to the CLI are recorded here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the version is the single
source of truth in the root `package.json`.

The repository and installed CLI binary are **openharness** — a provider-neutral
fork of [TogetherLink](https://github.com/Nutlope/togetherlink). The binary was
renamed from `togetherlink` to `openharness` during M7.

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

### Baseline

Forked from TogetherLink at pin `9f56ed93` (v0.5.26). Milestones M0–M6
(provider-neutral runtime, secret-safe runtime, OpenCode+Ollama,
OpenCode+OpenRouter, Claude multi-provider, Codex multi-provider) were completed
before the public-alpha milestone.
