import os from "node:os";
import * as clack from "@clack/prompts";
import { ALL_HARNESSES, HARNESS_LABEL, type HarnessId } from "../harness.js";
import { isHarnessImplemented } from "../harness-registry.js";
import { detectInstalledHarnesses } from "../detect.js";
import {
  OPENROUTER_API_KEY_ENV_REF,
  preferEnvRef,
  readGlobalConfig,
  resolveStoredApiKey,
  resolveStoredExaApiKey,
  resolveStoredOpenRouterApiKey,
  setGlobalApiKey,
  setGlobalExaApiKey,
  setGlobalOpenRouterApiKey,
} from "../global-config.js";
import { EXA_API_KEY_ENV_REF, TOGETHER_API_KEY_ENV_REF } from "../together-core.js";
import { OPENROUTER_API_KEY_ENV } from "../provider/openrouter-preset.js";
import { VERSION } from "../version.js";

export function printHelp() {
  console.log(`togetherlink v${VERSION} — session-scoped multi-provider harness launcher

Connect Claude Code, Codex, OpenCode, and Pi to model providers for one session
without permanently rewriting harness config. Together is an optional preset,
not a product requirement.

Usage:
  togetherlink configure              # optional provider keys (all skippable)
  togetherlink whoami
  togetherlink opencode [...]         # default provider: Ollama (no API key)
  togetherlink claude [...]           # Together preset (needs TOGETHER_API_KEY)
  togetherlink codex [...]
  togetherlink pi [...]
  togetherlink chatgpt [--model <model>] [--restore]  (alpha · Together preset)

OpenCode providers (session-only; does not write ~/.config/opencode):
  togetherlink opencode                                    # Ollama (default, no key)
  togetherlink opencode --provider ollama --main llama3.2
  togetherlink opencode --provider openrouter              # OPENROUTER_API_KEY
  togetherlink opencode --provider openrouter --main openai/gpt-4o-mini
  togetherlink opencode --provider together                # TOGETHER_API_KEY
  togetherlink --provider openrouter opencode              # flags before harness OK

Credentials are required only for the selected provider at launch time.
`);
}

export async function runConfigure(): Promise<boolean> {
  const home = os.homedir();
  clack.intro("togetherlink configure");
  clack.log.info(
    "Keys are optional and per provider. Skip any prompt with Enter. " +
      "Ollama needs no key. Claude/Codex/Pi still use the Together preset today.",
  );

  const detected = detectInstalledHarnesses();
  const notImplemented = ALL_HARNESSES.filter((h) => !isHarnessImplemented(h));

  const lines = ALL_HARNESSES.map((h) => {
    const found = detected[h].installed ? "found" : "not found";
    const support = isHarnessImplemented(h) ? " (session-only launch)" : " (support coming later)";
    return `  ${HARNESS_LABEL[h]}: ${found}${support}`;
  });
  clack.log.info(`Detected tools:\n${lines.join("\n")}`);

  const existing = resolveStoredApiKey((await readGlobalConfig(home)).apiKey);
  let togetherKey = existing || process.env.TOGETHER_API_KEY?.trim() || "";
  if (!togetherKey) {
    const entered = await clack.password({
      message: "Together API key (optional — Claude/Codex/Pi preset; Enter to skip):",
      validate: () => undefined,
    });
    if (clack.isCancel(entered)) {
      clack.cancel("Cancelled.");
      return false;
    }
    togetherKey = entered.trim();
  }
  await setGlobalApiKey(
    home,
    preferEnvRef(togetherKey, "TOGETHER_API_KEY", TOGETHER_API_KEY_ENV_REF),
  );
  if (togetherKey) {
    clack.log.success("Together preset key saved.");
  } else {
    clack.log.info("Together key skipped.");
  }

  const existingOr = resolveStoredOpenRouterApiKey((await readGlobalConfig(home)).openrouterApiKey);
  let openrouterKey = existingOr || process.env[OPENROUTER_API_KEY_ENV]?.trim() || "";
  if (!openrouterKey) {
    const enteredOr = await clack.password({
      message: "OpenRouter API key (optional — `opencode --provider openrouter`; Enter to skip):",
      validate: () => undefined,
    });
    if (clack.isCancel(enteredOr)) {
      clack.cancel("Cancelled.");
      return false;
    }
    openrouterKey = enteredOr.trim();
  }
  await setGlobalOpenRouterApiKey(
    home,
    preferEnvRef(openrouterKey, OPENROUTER_API_KEY_ENV, OPENROUTER_API_KEY_ENV_REF),
  );
  if (openrouterKey) {
    clack.log.success("OpenRouter key saved.");
  } else {
    clack.log.info("OpenRouter key skipped.");
  }

  // Exa powers the proxy's native web_search emulation for Claude Code. It's
  // optional — without it, searches return a clear "EXA_API_KEY not set" error.
  const existingExa = resolveStoredExaApiKey((await readGlobalConfig(home)).exaApiKey);
  let exaApiKey = existingExa || process.env.EXA_API_KEY || "";
  if (!exaApiKey) {
    const enteredExa = await clack.password({
      message: "Exa API key for web search (optional — Enter to skip; web search disabled):",
      validate: () => undefined,
    });
    if (clack.isCancel(enteredExa)) {
      clack.cancel("Cancelled.");
      return false;
    }
    exaApiKey = enteredExa.trim();
  }
  await setGlobalExaApiKey(home, preferEnvRef(exaApiKey, "EXA_API_KEY", EXA_API_KEY_ENV_REF));
  if (exaApiKey) {
    clack.log.success("Exa web search enabled.");
  } else {
    clack.log.info("Exa key skipped — web search unavailable in Claude Code proxy.");
  }

  const launchable = ALL_HARNESSES.filter(
    (h) => isHarnessImplemented(h) && detected[h as HarnessId].installed,
  );
  if (launchable.length > 0) {
    clack.log.info(
      `Ready: ${launchable.map((h) => HARNESS_LABEL[h]).join(", ")}. ` +
        `Try \`togetherlink opencode\` (Ollama, no key) or a harness that matches a key you set.`,
    );
  }

  if (notImplemented.length > 0) {
    clack.log.info(
      `${notImplemented.map((h) => HARNESS_LABEL[h]).join(" and ")} support is coming later.`,
    );
  }

  clack.outro("Done.");
  return true;
}
