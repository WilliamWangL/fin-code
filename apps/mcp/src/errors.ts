/**
 * A failure raised by the FinCode API or the transport. Mirrors the error
 * envelope documented at /docs/errors so `code` is stable enough for the model
 * to branch on: `NOT_FOUND`, `INVALID_IBAN`, `RATE_LIMITED`, `UNAUTHORIZED`, ...
 */
export class FinCodeApiError extends Error {
  readonly code: string;
  /** HTTP status, or 0 for network failures and timeouts. */
  readonly status: number;
  readonly requestId?: string;
  /** Value of the Retry-After header, in seconds. */
  readonly retryAfterSeconds?: number;

  constructor(init: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    super(init.message);
    this.name = "FinCodeApiError";
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** True for transient failures that may succeed when retried as-is. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }

  /** A 4xx that describes the identifier rather than the integration. */
  get isInputError(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 401 && this.status !== 429;
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.requestId ? { request_id: this.requestId } : {}),
      ...(this.retryAfterSeconds !== undefined ? { retry_after_seconds: this.retryAfterSeconds } : {}),
    };
  }
}
