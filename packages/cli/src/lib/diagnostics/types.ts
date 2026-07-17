/**
 * Shared types for the `doctor` (diagnostics) and `dry-run` (launch-plan preview)
 * commands introduced for the public-alpha milestone (M7).
 */

export type DoctorSeverity = "ok" | "info" | "warn" | "error";

/** A single environment/configuration check in a `doctor` report. */
export type DoctorCheck = {
  /** Stable id, e.g. `harness:opencode`, `provider:ollama`. */
  id: string;
  label: string;
  severity: DoctorSeverity;
  detail: string;
  /** Optional remediation hint shown to the user. */
  fix?: string;
};

export type DoctorReport = {
  product: string;
  version: string;
  platform: string;
  generatedAt: string;
  /** Highest severity among all checks. */
  status: DoctorSeverity;
  /** Human-friendly first-run recommendation derived from the checks. */
  recommendation: string;
  checks: DoctorCheck[];
};

export type LaunchPlan = {
  harness: string;
  harnessLabel: string;
  family: "proxied" | "spawned";
  provider: string;
  providerLabel: string;
  baseURL: string;
  model: string;
  /** True when the harness would write no permanent config (session-only). */
  sessionOnly: boolean;
  /** True when prompts would leave this machine (cloud provider). */
  cloudDestination: boolean;
  auth: {
    type: string;
    required: boolean;
    apiKeyEnv?: string;
    keyPresent: boolean;
  };
  /** Redacted inline config preview (no secrets). */
  configPreview?: Record<string, unknown> | undefined;
  /** Names of env vars the launch would set (values never included). */
  envPreview: string[];
  /** Args forwarded to the native binary (spawned harnesses). */
  passthrough: string[];
  notes: string[];
  warnings: string[];
  errors: string[];
};
