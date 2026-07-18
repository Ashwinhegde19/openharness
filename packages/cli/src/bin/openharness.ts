#!/usr/bin/env node
import os from "node:os";
import { loadEnvFile } from "../lib/load-env.js";
import { parseArgs } from "../lib/parse-args.js";
import { printHelp, runConfigure } from "../lib/commands/global.js";
import { dispatchHarnessCommand } from "../lib/commands/harness.js";
import { runDoctor } from "../lib/diagnostics/doctor.js";
import { runDryRun } from "../lib/diagnostics/launch-plan.js";
import type { HarnessContext } from "../lib/harness-types.js";
import { isHarnessCommand, resolveHarnessInvocation } from "../lib/commands/harness-invocation.js";
import { readGlobalConfig, resolveStoredExaApiKey } from "../lib/global-config.js";
import { maybeSelfUpdate } from "../lib/autoupdate.js";
import { getInstallId, sendTelemetryEvent } from "../lib/telemetry.js";
import { VERSION } from "../lib/version.js";

async function daemonStop(): Promise<void> {
  const { resolveDaemonPort, daemonUrl, daemonPidPath } = await import("../lib/daemon/server.js");
  const { readFile, unlink } = await import("node:fs/promises");
  const pidPath = daemonPidPath();
  const port = resolveDaemonPort();
  let pid: number | undefined;
  try {
    const raw = (await readFile(pidPath, "utf8")).trim();
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    pid = Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    pid = undefined;
  }
  if (pid === undefined) {
    console.log(`openharness daemon: not running (no pid file at ${pidPath}).`);
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      try {
        await unlink(pidPath);
      } catch {
        // ignore
      }
      console.log(`openharness daemon: not running (stale pid file removed).`);
      return;
    }
    throw err;
  }
  // Best-effort: the daemon removes its own pid file on SIGTERM. Give it a
  // moment, then clear a leftover if the signal was lost.
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    await unlink(pidPath);
  } catch {
    // already cleaned by the daemon
  }
  console.log(`openharness daemon: stopped (pid ${pid}) on ${daemonUrl(port)}.`);
}

async function loadStoredExaKey(): Promise<void> {
  if (process.env.EXA_API_KEY) {
    return;
  }
  try {
    const { exaApiKey } = await readGlobalConfig(process.env.HOME);
    const resolved = resolveStoredExaApiKey(exaApiKey);
    if (resolved) {
      process.env.EXA_API_KEY = resolved;
    }
  } catch {
    // No config yet (e.g. before first `configure`) — nothing to do.
  }
}

async function runInteractiveLauncher(): Promise<void> {
  if (!isInteractive()) {
    printHelp();
    return;
  }

  // No product-level Together key gate: credentials are resolved per provider
  // at launch time (Ollama needs none; OpenRouter/Together only when selected).
  const clack = await import("@clack/prompts");
  const choice = await clack.select({
    message: "What do you want to run?",
    options: [
      { value: "opencode", label: "OpenCode", hint: "ohopencode · default Ollama" },
      { value: "codex", label: "Codex", hint: "ohcodex · Together preset" },
      { value: "claude", label: "Claude Code", hint: "ohclaude · Together preset" },
      { value: "pi", label: "Pi Code", hint: "ohpi · Together preset" },
      { value: "chatgpt", label: "ChatGPT Desktop", hint: "chatgpt · Together preset" },
      { value: "configure", label: "Configure", hint: "optional provider keys" },
    ],
  });
  if (clack.isCancel(choice)) {
    clack.cancel("Cancelled.");
    return;
  }
  if (choice === "configure") {
    await runConfigure();
    return;
  }
  if (choice === "chatgpt") {
    // ChatGPT Desktop (the former Codex desktop app, merged in 2026). Routes
    // to the same codex-app flow as `openharness chatgpt` / `codex-app`.
    const { runCodexAppCommand } = await import("../lib/codex-app.js");
    const result = await runCodexAppCommand({ home: os.homedir() });
    if (result.message) {
      console.log(result.message);
    }
    if (result.payload) {
      console.log(JSON.stringify(result.payload, null, 2));
    }
    return;
  }

  await dispatchHarnessCommand(choice, undefined, {});
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function main() {
  // Self-update first (throttled, bounded, never throws). Placed before arg
  // parsing so even `openharness help` keeps an install current, but it's a
  // no-op unless this is the installed bundle and the throttle window passed.
  // Keep this before loading project .env files so a repo cannot redirect the
  // updater with OPENHARNESS_MANIFEST_URL / OPENHARNESS_HOME.
  await maybeSelfUpdate();

  // Load a .env (cwd → repo root) after self-update, and only for approved
  // credential keys, so local project env files cannot control the CLI runtime.
  loadEnvFile();

  // If EXA_API_KEY still isn't set (not in the env or .env), fall back to the
  // key stored by `openharness configure`, so the proxy's web search works
  // without the user re-sourcing .env every session.
  await loadStoredExaKey();

  const parsed = parseArgs(process.argv.slice(2));
  const [rawCommand, rawVerb] = parsed.positional;
  // `chatgpt` is the canonical command now that the Codex desktop app merged
  // into the ChatGPT desktop app; `codex-app` (and `chatgpt-app`) stay as
  // backward-compatible aliases. The internal command id / config markers /
  // backup dir keep the stable "codex-app" string so restore still finds old
  // config blocks written by previous versions.
  const command =
    rawCommand === "picode"
      ? "pi"
      : rawCommand === "chatgpt" || rawCommand === "chatgpt-app"
        ? "codex-app"
        : rawCommand;

  if (!command) {
    await runInteractiveLauncher();
    return;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v" || command === "version") {
    process.stdout.write(`openharness v${VERSION}\n`);
    return;
  }

  if (command === "whoami") {
    process.stdout.write(`${await getInstallId()}\n`);
    return;
  }

  if (command === "configure") {
    await runConfigure();
    return;
  }

  if (command === "doctor") {
    await runDoctor({ json: parsed.flags.json });
    return;
  }

  if (command === "dry-run") {
    // Re-parse everything after "dry-run" so harness-level product flags
    // (e.g. `--provider ollama`) land in passthrough and are peeled by the plan.
    const dryArgv = process.argv.slice(2).slice(1);
    const dryParsed = parseArgs(dryArgv);
    const harnessArg = dryParsed.positional[0];
    const dryCtx: HarnessContext = { home: os.homedir(), ...dryParsed.flags };
    await runDryRun(harnessArg, dryCtx, { json: dryParsed.flags.json });
    return;
  }

  // Internal entry point run by install.sh right after a successful install
  // verification. Not user-facing; emits the one-time install event.
  if (command === "__telemetry-install-completed") {
    await sendTelemetryEvent({ event: "install_completed" });
    return;
  }

  // Internal entry point: the daemon self-spawns with `--daemon` via
  // ensureDaemon() (launch.ts). Runs the shared proxy server forever; never
  // returns. Keep this before any command that needs a key — the daemon needs
  // no daemon-wide credentials (each session registers its own).
  if (command === "--daemon") {
    const { runDaemon } = await import("../lib/daemon/server.js");
    await runDaemon();
    return;
  }

  // User-facing daemon control. Not a harness, so handle it before the harness
  // dispatch (which would reject "daemon" as an unknown harness). Inlined from
  // the former daemon/cli.ts (a shallow pass-through with exactly one caller):
  // `serve` is already covered by the `--daemon` branch above, so only `stop`
  // reaches here.
  if (command === "daemon") {
    const verb = rawVerb;
    if (verb === undefined) {
      throw new Error('Unknown "daemon" command. Expected: stop.');
    }
    if (verb === "stop") {
      await daemonStop();
      return;
    }
    if (verb === "serve") {
      const { runDaemon } = await import("../lib/daemon/server.js");
      await runDaemon();
      return;
    }
    throw new Error(`Unknown "daemon ${verb}" command. Expected: stop.`);
  }

  if (command === "codex-app") {
    // Key check lives inside runCodexAppCommand (Together preset only).
    const { runCodexAppCommand } = await import("../lib/codex-app.js");
    const result = await runCodexAppCommand({ home: os.homedir(), ...parsed.flags });
    if (result.message) {
      console.log(result.message);
    }
    if (result.payload) {
      console.log(JSON.stringify(result.payload, null, 2));
    }
    return;
  }

  const invocation = resolveHarnessInvocation(parsed.positional, parsed.flags);

  if (isHarnessCommand(invocation.command)) {
    void sendTelemetryEvent({ event: "cli_started", agent: invocation.command });
  }

  await dispatchHarnessCommand(invocation.command, undefined, invocation.flags);
}

main().catch((err: unknown) => {
  if (!(err instanceof Error)) {
    console.error(`Error: ${String(err)}`);
    process.exitCode = 1;
    return;
  }
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
});
