import {
  CLAUDE_HAIKU_MODEL_SELECTION,
  CLAUDE_MODEL_CAPABILITIES,
  CLAUDE_SUPPORTED_MODELS,
  resolveClaudeModel,
  type ClaudeModelSelection,
} from "./defaults.js";
import { runProxiedSession, type ProxiedSessionResult } from "../proxied-session.js";
import { togetherEndpointConfig, type ProviderEndpointConfig } from "../provider/index.js";
import type { ModelDefinition } from "@openharness/models";

const CONFLICTING_ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION",
  "ANTHROPIC_CUSTOM_MODEL_OPTION",
  "ANTHROPIC_CUSTOM_MODEL_OPTION_NAME",
  "ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION",
  "ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES",
] as const;

// Preserve Claude Code's native 32k cumulative-output guard. Openharness
// independently caps ordinary upstream turns at 28k, while compaction keeps
// the full budget requested by Claude Code.
const DEFAULT_CLAUDE_CODE_MAX_OUTPUT_TOKENS = 32_000;

export type ClaudeLaunchOptions = {
  /** Upstream API key (or placeholder for no-auth providers). */
  apiKey: string;
  /** Claude-facing model alias (ANTHROPIC_MODEL). */
  modelId?: string;
  /** Upstream model id for the provider API. */
  targetModelId?: string;
  modelName?: string;
  modelDefinition?: ModelDefinition;
  /** Non-secret provider endpoint; defaults to Together. */
  provider?: ProviderEndpointConfig;
  /** Human label for banners (e.g. "OpenRouter"). */
  providerLabel?: string;
  args?: string[];
};

export type ClaudeLaunchResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
};

export function buildClaudeEnv({
  modelId,
  modelName,
  proxyUrl,
  authToken,
  providerLabel = "Together AI",
  modelDefinition,
}: {
  modelId: string;
  modelName: string;
  proxyUrl: string;
  authToken: string;
  providerLabel?: string;
  modelDefinition?: ModelDefinition;
}): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of CONFLICTING_ENV_KEYS) {
    delete env[key];
  }
  env.ANTHROPIC_BASE_URL = proxyUrl;
  // Use bearer-token mode for local proxy auth. Claude Code treats
  // ANTHROPIC_API_KEY as a user-supplied provider key and prompts about it;
  // ANTHROPIC_AUTH_TOKEN still sends Authorization: Bearer <token> to our
  // local daemon without entering that custom-key flow.
  env.ANTHROPIC_AUTH_TOKEN = authToken;
  env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY = "1";
  env.ANTHROPIC_MODEL = modelId;
  if (env.CLAUDE_CODE_MAX_OUTPUT_TOKENS === undefined) {
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(DEFAULT_CLAUDE_CODE_MAX_OUTPUT_TOKENS);
  }
  applyClaudeModelMenuEnv(env, modelId, providerLabel, modelDefinition);

  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY === undefined) {
    env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY = "1";
  }
  if (env.DISABLE_FEEDBACK_COMMAND === undefined) {
    env.DISABLE_FEEDBACK_COMMAND = "1";
  }
  return env;
}

function applyClaudeModelMenuEnv(
  env: NodeJS.ProcessEnv,
  selectedAlias: string,
  providerLabel: string,
  modelDefinition?: ModelDefinition,
): void {
  // Together catalog path: full multi-tier menu. Non-Together: single selected model.
  if (modelDefinition && !modelDefinition.anthropicAlias) {
    const selection: ClaudeModelSelection = {
      alias: selectedAlias,
      definition: modelDefinition,
    };
    setTierModelEnv(env, "OPUS", selection, providerLabel);
    setTierModelEnv(env, "SONNET", selection, providerLabel);
    setTierModelEnv(env, "HAIKU", selection, providerLabel);
    env.ANTHROPIC_CUSTOM_MODEL_OPTION = selectedAlias;
    env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME = modelDefinition.name;
    env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION = `Local Anthropic-to-${providerLabel} proxy`;
    env.ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES = CLAUDE_MODEL_CAPABILITIES;
    return;
  }

  const selected = resolveClaudeModel(selectedAlias);
  const defaultModel = CLAUDE_SUPPORTED_MODELS[0] ?? selected;
  const secondaryModel =
    CLAUDE_SUPPORTED_MODELS.find((model) => model.alias !== defaultModel.alias) ?? selected;

  setTierModelEnv(env, "OPUS", defaultModel, providerLabel);
  setTierModelEnv(env, "SONNET", secondaryModel, providerLabel);
  setTierModelEnv(env, "HAIKU", CLAUDE_HAIKU_MODEL_SELECTION, providerLabel);

  env.ANTHROPIC_CUSTOM_MODEL_OPTION = selected.alias;
  env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME = selected.definition.name;
  env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION = `Local Anthropic-to-${providerLabel} proxy`;
  env.ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES = CLAUDE_MODEL_CAPABILITIES;
}

function setTierModelEnv(
  env: NodeJS.ProcessEnv,
  tier: "OPUS" | "SONNET" | "HAIKU",
  model: ClaudeModelSelection,
  providerLabel: string,
): void {
  const prefix = `ANTHROPIC_DEFAULT_${tier}_MODEL`;
  env[prefix] = model.alias;
  env[`${prefix}_NAME`] = model.definition.name;
  env[`${prefix}_DESCRIPTION`] =
    `${providerLabel} (${model.definition.name}) via openharness — not Anthropic`;
}

/**
 * Launch Claude Code against a local Anthropic→Chat proxy that forwards to the
 * resolved provider (Together by default; OpenRouter/Ollama via --provider).
 */
export async function runClaudeTogether(options: ClaudeLaunchOptions): Promise<ClaudeLaunchResult> {
  const providerLabel = options.providerLabel ?? "Together AI";
  const selectedModel = options.modelDefinition
    ? {
        alias: options.modelId ?? options.modelDefinition.id,
        definition: options.modelDefinition,
      }
    : resolveClaudeModel(options.modelId);

  const targetModelId = options.targetModelId ?? selectedModel.definition.id;
  const modelName = options.modelName ?? selectedModel.definition.name;
  const provider: ProviderEndpointConfig = options.provider ?? togetherEndpointConfig();

  const result: ProxiedSessionResult = await runProxiedSession({
    agent: "claude",
    apiKey: options.apiKey,
    provider,
    modelId: selectedModel.alias,
    registrationModelId: selectedModel.alias,
    targetModelId,
    modelName,
    modelDefinition: selectedModel.definition,
    extraRegistration: {
      claudeCodeMaxOutputTokens: claudeCodeMaxOutputTokensFromEnv(
        process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS,
      ),
      claudeCodeMaxOutputTokensUserSet: process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS !== undefined,
    },
    args: options.args ?? [],
    binary: "claude",
    keepaliveLabel: "Claude session",
    banner: (name) =>
      `openharness ▸ Routing Claude Code → ${providerLabel} (${name}). Not Anthropic.\n`,
    buildEnv: ({ proxyUrl, authToken, modelId }) =>
      buildClaudeEnv({
        modelId,
        modelName,
        proxyUrl,
        authToken,
        providerLabel,
        modelDefinition: selectedModel.definition,
      }),
    buildArgs: ({ args }) => [
      ...claudeArgsWithoutModelOverrides(args),
      ...claudeCacheFriendlyArgs(args),
      ...claudeExtraSettingsArgs(args),
    ],
  });
  return result;
}

function claudeCodeMaxOutputTokensFromEnv(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_CLAUDE_CODE_MAX_OUTPUT_TOKENS;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLAUDE_CODE_MAX_OUTPUT_TOKENS;
}

function claudeArgsWithoutModelOverrides(args: string[]): string[] {
  const sanitized: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--model" || arg === "-m") {
      i += 1;
      continue;
    }
    if (arg.startsWith("--model=")) {
      continue;
    }
    sanitized.push(arg);
  }
  return sanitized;
}

function claudeCacheFriendlyArgs(args: string[]): string[] {
  for (const arg of args) {
    if (
      arg === "--exclude-dynamic-system-prompt-sections" ||
      arg === "--system-prompt" ||
      arg.startsWith("--system-prompt=") ||
      arg === "--system-prompt-file" ||
      arg.startsWith("--system-prompt-file=")
    ) {
      return [];
    }
  }
  return ["--exclude-dynamic-system-prompt-sections"];
}

// Extra settings.json keys openharness applies by default. These are
// settings-only (no env-var equivalent), so they're injected via claude's
// `--settings <json>` flag, which *merges* into the user's existing settings
// rather than replacing them. We bail out entirely if the user already passed
// `--settings` themselves, so we never clobber their explicit config.
function claudeExtraSettingsArgs(args: string[]): string[] {
  for (const arg of args) {
    if (arg === "--settings" || arg.startsWith("--settings=")) {
      return [];
    }
  }

  // skipWebFetchPreflight: the WebFetch tool pings api.anthropic.com directly
  // (bypassing ANTHROPIC_BASE_URL / our proxy) for its domain safety check. In
  // a openharness session api.anthropic.com isn't our model endpoint, so the
  // preflight fails and WebFetch breaks entirely. Skipping it restores
  // WebFetch without reaching Anthropic. Only sends a boolean — no other
  // settings keys are added here.
  return ["--settings", JSON.stringify({ skipWebFetchPreflight: true })];
}
