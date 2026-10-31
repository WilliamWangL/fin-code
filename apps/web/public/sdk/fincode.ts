/**
 * FinCode reference client for TypeScript / JavaScript.
 *
 * Dependency-free: works on Node 18+, Bun, Deno and modern browsers.
 * Download this file, drop it next to your code and import it directly:
 *
 *   import { FinCode } from "./fincode";
 *
 *   const fincode = new FinCode({ apiKey: process.env.FINCODE_API_KEY! });
 *   const { data, meta } = await fincode.swift.get("ICBKCNBJ");
 *
 * Every call resolves to the API envelope `{ data, meta }`, where `meta.request_id`
 * is the identifier to quote when contacting support. Failures throw a
 * `FinCodeError` carrying the machine readable code, HTTP status and request id.
 */

export const DEFAULT_BASE_URL = "https://api.ecommica.com/v1";
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RETRIES = 2;

/** Statuses the API may return transiently; retried with exponential backoff. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const BASE_BACKOFF_MS = 250;

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface FinCodeOptions {
  /** API key with the `sk_` prefix. */
  apiKey: string;
  /** Base URL including the version segment. Defaults to the production host. */
  baseUrl?: string;
  /** Per-attempt timeout in milliseconds. Defaults to 10 seconds. */
  timeoutMs?: number;
  /** Retries after the first attempt for 429/502/503/504 and network errors. */
  maxRetries?: number;
  /** Custom fetch implementation (tests, proxies). Defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
}

export interface FinCodeMeta {
  request_id: string;
  next_cursor?: string | null;
}

export interface FinCodeResult<T> {
  data: T;
  meta: FinCodeMeta;
}

export interface CallOptions {
  signal?: AbortSignal;
}

export interface ListOptions extends CallOptions {
  /** Page size, 1-100. The API defaults to 20. */
  limit?: number;
  /** Cursor from the previous response (`meta.next_cursor`). */
  cursor?: string;
  /** ISO 3166-1 alpha-2 country filter. */
  country?: string;
}

export interface BranchOptions extends ListOptions {
  /** Free-text search across branch name and address. */
  q?: string;
  /** City filter. */
  city?: string;
}

export interface RequestOptions extends CallOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

export interface FinCodeErrorInit {
  code: string;
  message: string;
  /** HTTP status, or 0 for network failures and timeouts. */
  status: number;
  requestId?: string;
  /** Value of the Retry-After header, in seconds. */
  retryAfterSeconds?: number;
}

export class FinCodeError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(init: FinCodeErrorInit) {
    super(init.message);
    this.name = "FinCodeError";
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** True for transient failures that may succeed when retried as-is. */
  get isRetryable(): boolean {
    return this.status === 0 || RETRYABLE_STATUSES.has(this.status);
  }
}

// ── Payload shapes (loose by design: fields evolve within V1) ────────────────

export type ResourceRecord = Record<string, unknown>;

export interface IbanChecks {
  charset?: boolean;
  country?: boolean;
  length?: boolean;
  checksum?: boolean;
  structure?: boolean;
}

export interface IbanValidation {
  valid: boolean;
  iban: string;
  country?: string | null;
  check_digits?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
  length: number;
  expected_length?: number | null;
  checks?: IbanChecks;
}

export interface IbanLookup extends IbanValidation {
  bank?: ResourceRecord | null;
}

export type SwiftRecord = ResourceRecord;
export type RoutingRecord = ResourceRecord;
export type SortCodeRecord = ResourceRecord;
export type BsbRecord = ResourceRecord;
export type IfscRecord = ResourceRecord;
export type CnapsRecord = ResourceRecord;
export type BinRecord = ResourceRecord;
export type BankSummary = ResourceRecord;
export type BankDetail = ResourceRecord;
export type BranchRecord = ResourceRecord;
export type CountryRecord = ResourceRecord;
export type IbanFormatRecord = ResourceRecord;
export type LookupResult = ResourceRecord;

class TimeoutError extends Error {}

function readRetryAfter(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  const seconds = header === null ? Number.NaN : Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toFinCodeError(response: Response, payload: unknown): FinCodeError {
  const envelope = (payload ?? {}) as {
    error?: { code?: string; message?: string; request_id?: string };
  };
  return new FinCodeError({
    code: envelope.error?.code ?? `HTTP_${response.status}`,
    message:
      envelope.error?.message ?? response.statusText ?? `Request failed with status ${response.status}`,
    status: response.status,
    requestId: envelope.error?.request_id,
    retryAfterSeconds: readRetryAfter(response),
  });
}

function backoffDelay(attempt: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds !== undefined) return retryAfterSeconds * 1000;
  const exponential = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  return exponential + Math.random() * BASE_BACKOFF_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FinCode {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: FinCodeOptions) {
    if (!options?.apiKey) {
      throw new Error("FinCode: an apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.defaultHeaders = options.headers ?? {};

    if (typeof this.fetchImpl !== "function") {
      throw new Error("FinCode: no fetch implementation available, pass one via options.fetch");
    }
  }

  // ── IBAN ─────────────────────────────────────────────────────────────────
  readonly iban = {
    /** Format, length, MOD-97 and BBAN structure checks. */
    validate: (iban: string, options: CallOptions = {}) =>
      this.request<IbanValidation>("GET", "/iban/validate", {
        query: { iban },
        signal: options.signal,
      }),
    /** Validate and resolve the bank behind the IBAN (null while unknown). */
    lookup: (iban: string, options: CallOptions = {}) =>
      this.request<IbanLookup>("GET", `/iban/${encodeURIComponent(iban)}`, {
        signal: options.signal,
      }),
  };

  // ── National identifiers ─────────────────────────────────────────────────
  readonly swift = {
    get: (code: string, options: CallOptions = {}) =>
      this.request<SwiftRecord>("GET", `/swift/${encodeURIComponent(code)}`, {
        signal: options.signal,
      }),
  };

  readonly routing = {
    get: (number: string, options: CallOptions = {}) =>
      this.request<RoutingRecord>("GET", `/routing/${encodeURIComponent(number)}`, {
        signal: options.signal,
      }),
  };

  readonly sortCode = {
    get: (code: string, options: CallOptions = {}) =>
      this.request<SortCodeRecord>("GET", `/sort-code/${encodeURIComponent(code)}`, {
        signal: options.signal,
      }),
  };

  readonly bsb = {
    get: (code: string, options: CallOptions = {}) =>
      this.request<BsbRecord>("GET", `/bsb/${encodeURIComponent(code)}`, { signal: options.signal }),
  };

  readonly ifsc = {
    get: (code: string, options: CallOptions = {}) =>
      this.request<IfscRecord>("GET", `/ifsc/${encodeURIComponent(code)}`, {
        signal: options.signal,
      }),
  };

  readonly cnaps = {
    get: (code: string, options: CallOptions = {}) =>
      this.request<CnapsRecord>("GET", `/cnaps/${encodeURIComponent(code)}`, {
        signal: options.signal,
      }),
  };

  readonly bin = {
    get: (bin: string, options: CallOptions = {}) =>
      this.request<BinRecord>("GET", `/bin/${encodeURIComponent(bin)}`, { signal: options.signal }),
  };

  // ── Directory ────────────────────────────────────────────────────────────
  readonly banks = {
    list: ({ signal, ...query }: ListOptions = {}) =>
      this.request<BankSummary[]>("GET", "/banks", { query, signal }),
    search: (q: string, { signal, ...rest }: ListOptions = {}) =>
      this.request<BankSummary[]>("GET", "/banks/search", { query: { q, ...rest }, signal }),
    get: (id: string, options: CallOptions = {}) =>
      this.request<BankDetail>("GET", `/banks/${encodeURIComponent(id)}`, { signal: options.signal }),
    bySlug: (slug: string, options: CallOptions = {}) =>
      this.request<BankDetail>("GET", `/banks/by-slug/${encodeURIComponent(slug)}`, {
        signal: options.signal,
      }),
    branches: (id: string, { signal, ...query }: BranchOptions = {}) =>
      this.request<BranchRecord[]>("GET", `/banks/${encodeURIComponent(id)}/branches`, {
        query,
        signal,
      }),
  };

  readonly countries = {
    list: (options: CallOptions = {}) =>
      this.request<CountryRecord[]>("GET", "/countries", { signal: options.signal }),
    get: (code: string, options: CallOptions = {}) =>
      this.request<CountryRecord>("GET", `/countries/${encodeURIComponent(code)}`, {
        signal: options.signal,
      }),
    ibanFormat: (code: string, options: CallOptions = {}) =>
      this.request<IbanFormatRecord>("GET", `/countries/${encodeURIComponent(code)}/iban-format`, {
        signal: options.signal,
      }),
  };

  readonly lookup = {
    /** Detect the identifier type from the input and resolve it. */
    get: (q: string, options: CallOptions = {}) =>
      this.request<LookupResult>("GET", "/lookup", { query: { q }, signal: options.signal }),
  };

  // ── Transport ────────────────────────────────────────────────────────────

  /** Low-level escape hatch for endpoints without a typed helper. */
  async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<FinCodeResult<T>> {
    const url = this.buildUrl(path, options.query);
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const attempts = this.maxRetries + 1;

    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.send(method, url, body, options.signal);
        const payload = await readBody(response);

        if (response.ok) {
          return payload as FinCodeResult<T>;
        }

        const error = toFinCodeError(response, payload);
        if (attempt < attempts && error.isRetryable) {
          await sleep(backoffDelay(attempt, error.retryAfterSeconds));
          continue;
        }
        throw error;
      } catch (cause) {
        if (cause instanceof FinCodeError) throw cause;
        // The caller cancelled: never retry, surface the original signal error.
        if (options.signal?.aborted) throw cause;
        if (attempt < attempts) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        const timedOut = cause instanceof TimeoutError;
        throw new FinCodeError({
          code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
          message: timedOut
            ? `Request timed out after ${this.timeoutMs} ms`
            : cause instanceof Error
              ? cause.message
              : "Network request failed",
          status: 0,
        });
      }
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | null | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private async send(
    method: HttpMethod,
    url: string,
    body: string | undefined,
    signal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const forwardAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", forwardAbort, { once: true });

    try {
      return await this.fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...this.defaultHeaders,
        },
        body,
        signal: controller.signal,
      });
    } catch (cause) {
      if (timedOut) throw new TimeoutError(`Timed out after ${this.timeoutMs} ms`);
      throw cause;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }
}
