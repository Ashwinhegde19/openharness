# openharness

[![Live Agent Gauntlet](https://github.com/Nutlope/togetherlink/actions/workflows/live-agent-gauntlet.yml/badge.svg?branch=main)](https://github.com/Nutlope/togetherlink/actions/workflows/live-agent-gauntlet.yml)

![TogetherLink hero](assets/openharness-hero.png)

Use [Together AI](https://togetherai.link/?utm_source=openharness&utm_medium=referral&utm_campaign=example-app) models from local coding-agent CLIs.

## For AI agents

An LLM-readable documentation file is published at <https://openharness.vercel.app/llms.txt>. If you are an AI agent asked to install, configure, or use openharness (including headless use), read that file first — it covers install, configure, every command, the available models, headless/agentic usage patterns, and how to keep the tool up to date.

## Install

One-liner — installs the `openharness`, `tclaude`, `topencode`, `tcodex`, and `tpi` commands to `~/.openharness/bin/` and installs [Bun](https://bun.sh) for you if it isn't already present:

```bash
curl -fsSL https://openharness.vercel.app/install.sh | sh
```

Then run `openharness` and pick the coding tool you want to start:

```bash
openharness
```

Or launch a tool directly:

```bash
openharness codex        # alias: tcodex
openharness chatgpt      # alpha: ChatGPT Desktop session with restore (alias: codex-app)
openharness claude       # alias: tclaude
openharness pi           # alias: tpi
openharness opencode     # alias: topencode
```

If no Together API key is configured yet, an interactive launch automatically runs `openharness configure` first. You can also run `openharness configure` directly, or set `TOGETHER_API_KEY`. The installed binary keeps itself up to date automatically from `openharness.vercel.app`.

If the underlying agent CLI is missing, openharness does not install it automatically. It prints the official install command and docs link for the selected tool, then exits.

The compact CLI guide is:

```text
openharness configure
openharness chatgpt [--model <model>] [--restore]  (alpha, alias: codex-app)
openharness codex [...]       (alias: tcodex)
openharness claude [...]      (alias: tclaude)
openharness pi [...]          (alias: tpi)
openharness opencode [...]    (alias: topencode)
```

## Local Development

Install dependencies from the repo root:

```bash
pnpm install
```

Build the TypeScript CLI:

```bash
pnpm -F @openharness/cli build
```

Keep the CLI rebuilding while you edit:

```bash
pnpm dev
```

Leave that running in one terminal, then run `openharness` commands from another terminal.

Run the built CLI directly:

```bash
node packages/cli/dist/bin/openharness.js
node packages/cli/dist/bin/openharness.js help
```

Run through the workspace bin, which is closest to how users will invoke it:

```bash
pnpm -F @openharness/cli exec openharness
pnpm -F @openharness/cli exec openharness help
```

Testing commands and live smoke notes live in [TESTING.md](TESTING.md).

## Author

- [Riccardo Giorato](https://github.com/riccardogiorato) ([X](https://x.com/riccardogiorato))
- [Hassan](https://github.com/Nutlope) ([X](https://x.com/nutlope))
