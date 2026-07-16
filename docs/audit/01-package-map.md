# Package and dependency map

## Workspace

| Path              | Package name             | Role                                      |
| ----------------- | ------------------------ | ----------------------------------------- |
| `/`               | `togetherlink` (private) | Root workspace, scripts, turbo            |
| `packages/cli`    | `@togetherlink/cli`      | CLI binary, harnesses, daemon, proxies    |
| `packages/models` | `@togetherlink/models`   | Together model catalog, pricing, base URL |
| `packages/tests`  | `@togetherlink/tests`    | Vitest suite, fixtures, benches           |
| `site`            | `@togetherlink/site`     | Install site, telemetry API, dashboard    |

Runtime: **Node ≥ 18**, package manager **pnpm@11.9.0**, optional **Bun** for installed bundle.

## CLI dependency graph (runtime)

```text
@togetherlink/cli
├── @clack/prompts          (interactive configure)
└── @togetherlink/models    (workspace) model defs + TOGETHER_BASE_URL

Node/Bun built-ins only for HTTP (fetch), process spawn, sqlite (node:sqlite / bun:sqlite)
```

No LiteLLM, no Express. Daemon is a small `node:http` server.

## Conceptual ownership (matches openharness ARCHITECTURE)

```text
packages/cli/src/bin/togetherlink.ts     CLI entry, configure, daemon stop
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
pnpm -F @togetherlink/cli build
pnpm -F @togetherlink/models build
pnpm test                          # vitest via packages/tests
pnpm -F @togetherlink/cli typecheck
```

## Persistent local paths

| Path                            | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `~/.togetherlink/`              | Product home (`TOGETHERLINK_HOME` override) |
| `~/.togetherlink/config.json`   | Global API keys (Together, optional Exa)    |
| `~/.togetherlink/daemon.sqlite` | Session registry (includes secrets today)   |
| `~/.togetherlink/bin/`          | Installed CLI bundle (autoupdate path)      |
| `~/.togetherlink/install-id`    | Telemetry install id                        |

## Site / release (out of M1 scope)

- Install: `scripts/install.sh` → downloads from `togetherlink.vercel.app`
- Autoupdate: `autoupdate.ts` + `TOGETHERLINK_MANIFEST_URL`
- Telemetry: default `TOGETHERLINK_TELEMETRY_URL` → site Convex API
