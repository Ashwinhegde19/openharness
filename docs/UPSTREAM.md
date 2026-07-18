# Upstream baseline

- Source: https://github.com/Nutlope/togetherlink
- Optional mirror fork: https://github.com/Ashwinhegde19/openharness
- Pinned commit: `9f56ed93b4b0d73d7a96bc70574851e21a46cdf7`
- Version at pin: 0.5.26
- License file: MIT (`LICENSE`); package.json fields currently say Apache-2.0 — reconcile before release
- Role: implementation baseline for this product (ADR-0001)

Planning docs live under [`docs/`](./). Original TogetherLink CLI README:

- [UPSTREAM-TOGETHERLINK-README.md](UPSTREAM-TOGETHERLINK-README.md)
- M0 audit: [audit/README.md](audit/README.md)

## Git remotes

This repository is configured with:

```text
origin    https://github.com/Ashwinhegde19/openharness.git
upstream  https://github.com/Nutlope/togetherlink.git
```

Fetch upstream updates without merging blindly:

```bash
git fetch upstream
git log --oneline HEAD..upstream/main | head
```

Do not bulk-rename branding until provider-neutral architecture is stable (see ROADMAP M1–M6).

**Upstream vs this product:** TogetherLink required a Together API key for interactive use. This product does **not** — credentials are per provider at launch. Together remains available as a preset for regression and for harnesses not yet generalized (Claude/Codex/Pi).
