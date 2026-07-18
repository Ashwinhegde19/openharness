# Package and dependency map

## Workspace

| Path              | Package name            | Role                                      |
| ----------------- | ----------------------- | ----------------------------------------- |
| `/`               | `openharness` (private) | Root workspace, scripts, turbo            |
| `packages/cli`    | `@openharness/cli`      | CLI binary, harnesses, daemon, proxies    |
| `packages/models` | `@openharness/models`   | Together model catalog, pricing, base URL |
| `packages/tests`  | `@openharness/tests`    | Vitest suite, fixtures, benches           |
| `site`            | `@openharness/site`     | Install site, telemetry API, dashboard    |

Runtime: **Node ≥ 18**, package manager **pnpm@11.9.0**, optional **Bun** for installed bundle.

## CLI dependency graph (runtime)

```text
@openharness/cli
├── @clack/prompts          (interactive configure)
└── @openharness/models    (workspace) model defs + TOGETHER_BASE_URL

Node/Bun built-ins only for HTTP (fetch), process spawn, sqlite (node:sqlite / bun:sqlite)
```

No LiteLLM, no Express. Daemon is a small `node:http` server.

## Conceptual ownership (matches openharness ARCHITECTURE)

```text
packages/cli/src/bin/openharness.ts    CLI entry, configure, daemon stop
packages/cli/src/lib/commands/           parse + dispatch
packages/cli/src/lib/harnesses/          harness adapters (thin)
packages/cli/src/lib/claude|codex|opencode/  protocol + launch details
packages/cli/src/lib/daemon/             shared proxy process + session store
packages/cli/src/lib/together-client.ts  upstream Chat Completions client
packages/cli/src/lib/proxied-session.ts  Claude/Codex lifecycle
packages/models/src/index.ts             Together-only catalog
packages/tests/                          regression surface for M1
```

## Build / test commands

```bash
pnpm install
pnpm -F @openharness/cli build
pnpm -F @openharness/models build
pnpm test                          # vitest via packages/tests
pnpm -F @openharness/cli typecheck
```

## Persistent local paths

| Path                           | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `~/.openharness/`              | Product home (`OPENHARNESS_HOME` override) |
| `~/.openharness/config.json`   | Global API keys (Together, optional Exa)   |
| `~/.openharness/daemon.sqlite` | Session registry (includes secrets today)  |
| `~/.openharness/bin/`          | Installed CLI bundle (autoupdate path)     |
| `~/.openharness/install-id`    | Telemetry install id                       |

## Site / release (out of M1 scope)

- Install: `scripts/install.sh` → downloads from `openharness.vercel.app`
- Autoupdate: `autoupdate.ts` + `OPENHARNESS_MANIFEST_URL`
- Telemetry: default `OPENHARNESS_TELEMETRY_URL` → site Convex API
