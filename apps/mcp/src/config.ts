/** Production API root, including the version segment. */
export const DEFAULT_BASE_URL = "https://api.ecommica.com/v1";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_RETRIES = 1;

/**
 * Runtime configuration, resolved once at startup from the environment. The
 * same variables work for Cursor, Claude Code and Claude Desktop, which all
 * pass `env` straight through to the spawned process.
 */
export interface McpConfig {
  /** Optional API key (`sk_` prefix). Without it only the public identifier lookups work. */
  apiKey?: string;
  /** API root including `/v1`. */
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

function trimmed(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate ? candidate : undefined;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const baseUrl = trimmed(env.FINCODE_API_BASE_URL) ?? DEFAULT_BASE_URL;
  return {
    apiKey: trimmed(env.FINCODE_API_KEY),
    baseUrl: baseUrl.replace(/\/+$/, ""),
    timeoutMs: positiveInteger(env.FINCODE_MCP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxRetries: positiveInteger(env.FINCODE_MCP_MAX_RETRIES, DEFAULT_MAX_RETRIES),
  };
}
