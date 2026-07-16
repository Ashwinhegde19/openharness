/**
 * Product flags that may appear after a harness name (users often write
 * `togetherlink claude --provider openrouter`). Peel them into context so
 * they are not forwarded to the native binary.
 */
export function peelProductFlags(args: string[]): {
  rest: string[];
  provider?: string;
  baseUrl?: string;
  main?: string;
  apiKey?: string;
} {
  const rest: string[] = [];
  let provider: string | undefined;
  let baseUrl: string | undefined;
  let main: string | undefined;
  let apiKey: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--provider" || arg.startsWith("--provider=")) {
      const value = arg.includes("=") ? arg.slice("--provider=".length) : args[++i];
      if (value) {
        provider = value;
      }
      continue;
    }
    if (arg === "--base-url" || arg.startsWith("--base-url=")) {
      const value = arg.includes("=") ? arg.slice("--base-url=".length) : args[++i];
      if (value) {
        baseUrl = value;
      }
      continue;
    }
    if (
      arg === "--main" ||
      arg === "--model" ||
      arg === "-m" ||
      arg.startsWith("--main=") ||
      arg.startsWith("--model=")
    ) {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : args[++i];
      if (value) {
        main = value;
      }
      continue;
    }
    if (arg === "--api-key" || arg.startsWith("--api-key=")) {
      const value = arg.includes("=") ? arg.slice("--api-key=".length) : args[++i];
      if (value) {
        apiKey = value;
      }
      continue;
    }
    rest.push(arg);
  }
  return {
    rest,
    ...(provider !== undefined ? { provider } : {}),
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    ...(main !== undefined ? { main } : {}),
    ...(apiKey !== undefined ? { apiKey } : {}),
  };
}
