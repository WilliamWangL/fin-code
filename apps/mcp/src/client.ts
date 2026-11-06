import type { McpConfig } from "./config.js";
import { FinCodeApiError } from "./errors.js";
import { VERSION } from "./version.js";

/** Success envelope documented at /docs/quickstart: `{ data, meta }`. */
export interface ApiEnvelope<T> {
  data: T;
  meta: { request_id?: string; next_cursor?: string | null };
}

export interface RateLimitInfo {
  /** Requests allowed per window, from `X-RateLimit-Limit`. */
  limit: number;
  /** Requests left in the current window, from `X-RateLimit-Remaining`. */
  remaining: number;
}

export interface ApiResult<T> {
  data: T;
  requestId: string;
  nextCursor?: string | null;
  rateLimit?: RateLimitInfo;
}

export type QueryValue = string | number | boolean | null | undefined;

export interface ClientOptions {
  /** Custom fetch, for tests and proxies. Defaults to the global implementation. */
  fetch?: typeof globalThis.fetch;
  /** Sleep hook, so retry tests do not wait in real time. */
  sleep?: (ms: number) => Promise<void>;
}

const BASE_BACKOFF_MS = 250;
/** Long Retry-After values are surfaced instead of waited out (stdio clients time out). */
const MAX_RETRY_AFTER_MS = 5_000;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Minimal FinCode API client: Bearer auth when a key is configured, per-attempt
 * timeouts, bounded retries that honour Retry-After, and errors that keep the
 * API error code and request id.
 */
export class FinCodeClient {
  private readonly config: McpConfig;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(config: McpConfig, options: ClientOptions = {}) {
    this.config = config;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.sleep = options.sleep ?? defaultSleep;
  }

  /** False when running keyless; only the public identifier lookups are reachable then. */
  get authenticated(): boolean {
    return this.config.apiKey !== undefined;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async get<T>(path: string, query?: Record<string, QueryValue>): Promise<ApiResult<T>> {
    const url = this.buildUrl(path, query);
    const attempts = this.config.maxRetries + 1;

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.send<T>(url);
      } catch (cause) {
        if (!(cause instanceof FinCodeApiError) || !cause.isRetryable || attempt >= attempts) {
          throw cause;
        }
        const delay = retryDelay(attempt, cause.retryAfterSeconds);
        if (delay === undefined) throw cause;
        await this.sleep(delay);
      }
    }
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${this.config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private headers(): Record<string, string> {
    return {
      accept: "application/json",
      "user-agent": `fincode-mcp/${VERSION} (node ${process.version})`,
      ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }

  private async send<T>(url: string): Promise<ApiResult<T>> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: this.headers(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (cause) {
      const timedOut = cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
      throw new FinCodeApiError({
        code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
        message: timedOut
          ? `Request timed out after ${this.config.timeoutMs} ms`
          : cause instanceof Error
            ? cause.message
            : "Network request failed",
        status: 0,
      });
    }

    const body = await readBody(response);
    if (!response.ok) {
      throw toApiError(response, body);
    }
    if (!isEnvelope<T>(body)) {
      throw new FinCodeApiError({
        code: "UNEXPECTED_RESPONSE",
        message: "The API returned a body without a data/meta envelope",
        status: response.status,
      });
    }

    return {
      data: body.data,
      requestId: body.meta.request_id ?? "unknown",
      nextCursor: body.meta.next_cursor ?? null,
      rateLimit: readRateLimit(response),
    };
  }
}

function retryDelay(attempt: number, retryAfterSeconds?: number): number | undefined {
  const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  if (retryAfterSeconds === undefined) return backoff;
  const requested = retryAfterSeconds * 1_000;
  if (requested > MAX_RETRY_AFTER_MS) return undefined;
  return Math.max(requested, backoff);
}

async function readBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text) return undefined;
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isEnvelope<T>(body: unknown): body is ApiEnvelope<T> {
  return (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof (body as { meta?: unknown }).meta === "object" &&
    (body as { meta?: unknown }).meta !== null
  );
}

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown; request_id?: unknown };
}

function toApiError(response: Response, body: unknown): FinCodeApiError {
  const error = (body as ErrorEnvelope | undefined)?.error;
  const code = typeof error?.code === "string" ? error.code : fallbackCode(response.status);
  const message =
    typeof error?.message === "string" ? error.message : `The API responded with HTTP ${response.status}`;
  const requestId = typeof error?.request_id === "string" ? error.request_id : undefined;
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);

  return new FinCodeApiError({
    code,
    message,
    status: response.status,
    requestId,
    retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined,
  });
}

function fallbackCode(status: number): string {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL";
  return "HTTP_ERROR";
}

function readRateLimit(response: Response): RateLimitInfo | undefined {
  const limit = Number.parseInt(response.headers.get("x-ratelimit-limit") ?? "", 10);
  const remaining = Number.parseInt(response.headers.get("x-ratelimit-remaining") ?? "", 10);
  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return undefined;
  return { limit, remaining };
}
