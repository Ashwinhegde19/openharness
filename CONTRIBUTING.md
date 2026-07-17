# Contributing

Thanks for helping build this project. It is a fork of
[TogetherLink](https://github.com/Nutlope/togetherlink) generalized into a
provider-neutral launcher; see [`docs/UPSTREAM.md`](docs/UPSTREAM.md) for the
pinned baseline and the relationship between the two repos.

## Orientation

```text
packages/cli      CLI, harness adapters, daemon, protocol proxies, diagnostics
packages/models   Model catalog (Together preset today)
packages/tests    Vitest suite (offline; live E2E is opt-in)
docs/             Product docs, ADRs, diagrams, audit notes, compatibility matrix
```

Read in this order before changing launch behavior:

1. [`docs/PRODUCT.md`](docs/PRODUCT.md) — problem, users, scope, non-goals
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — components, sessions, providers
3. [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, credential handling
4. [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) — how support is claimed/measured
5. [`docs/STATUS.md`](docs/STATUS.md) — milestone checklist (what is done, open debt)

## Development setup

This is a pnpm workspace.

```bash
pnpm install
pnpm -F @togetherlink/cli build
pnpm -F @togetherlink/tests test          # offline unit tests
```

## Tests

- **Offline unit tests** must pass and are the default CI gate. They never
  require provider keys or harness binaries.
- **Live E2E** (real provider calls, real harness binaries) is opt-in and
  skips cleanly without keys. Do not make offline CI depend on network secrets.

When you change launch behavior, provider routing, credential handling,
persistence, configuration access, protocol translation, or support claims,
update the relevant docs and tests **in the same change**.

## Commit and PR style

- Keep commits atomic: one logical change per commit.
- Prefix the subject with a scope: `feat(cli):`, `fix(proxy):`, `test(codex):`,
  `docs:`, `refactor(opencode):`.
- Update [`docs/STATUS.md`](docs/STATUS.md) when a milestone item lands (one
  atomic `docs:` commit is preferred for status changes).
- A PR that changes behavior should include a test and a doc update, not just
  code.

## Adding a provider or harness

Providers and harnesses are accepted through acceptance criteria, not by
breadth. New providers are independent of harnesses (see the roadmap
principles in [`docs/ROADMAP.md`](docs/ROADMAP.md)). For support requests, use
the **New harness or provider support** issue template.

Supported combinations are published in
[`docs/compatibility-matrix.json`](docs/compatibility-matrix.json). Extend it
when you add or change a launch path, and keep its `tested` field honest
(`unit` vs `live-optional`).

## Code of conduct

Be respectful and constructive. Assume good intent. Keep discussions focused
on the artifact, not the person.
