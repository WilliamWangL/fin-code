import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FinCodeClient } from "./client.js";
import type { McpConfig } from "./config.js";
import { FinCodeApiError } from "./errors.js";

const BASE_CONFIG: McpConfig = {
  apiKey: undefined,
  baseUrl: "https://api.test/v1",
  timeoutMs: 1_000,
  maxRetries: 1,
};

interface Call {
  url: string;
  headers: Record<string, string>;
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function recordingFetch(handler: (call: Call, index: number) => Response): {
  fetch: typeof globalThis.fetch;
  calls: Call[];
} {
  const calls: Call[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(call);
    return handler(call, calls.length - 1);
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const noSleep = async () => {};

describe("FinCodeClient", () => {
  it("unwraps the { data, meta } envelope and reads the rate-limit headers", async () => {
    const { fetch } = recordingFetch(() =>
      jsonResponse(
        { data: { swiftCode: "DEUTDEFF" }, meta: { request_id: "req_1" } },
        { headers: { "x-ratelimit-limit": "10", "x-ratelimit-remaining": "7" } },
      ),
    );
    const client = new FinCodeClient(BASE_CONFIG, { fetch, sleep: noSleep });

    const result = await client.get<{ swiftCode: string }>("/swift/DEUTDEFF");

    assert.equal(result.data.swiftCode, "DEUTDEFF");
    assert.equal(result.requestId, "req_1");
    assert.deepEqual(result.rateLimit, { limit: 10, remaining: 7 });
  });

  it("sends no Authorization header when keyless and a Bearer token when configured", async () => {
    const keyless = recordingFetch(() => jsonResponse({ data: {}, meta: { request_id: "req_1" } }));
    await new FinCodeClient(BASE_CONFIG, { fetch: keyless.fetch, sleep: noSleep }).get("/swift/DEUTDEFF");
    assert.equal(keyless.calls[0]?.headers.authorization, undefined);

    const keyed = recordingFetch(() => jsonResponse({ data: {}, meta: { request_id: "req_1" } }));
    await new FinCodeClient({ ...BASE_CONFIG, apiKey: "sk_test" }, { fetch: keyed.fetch, sleep: noSleep }).get(
      "/banks",
    );
    assert.equal(keyed.calls[0]?.headers.authorization, "Bearer sk_test");
  });

  it("serialises query parameters and skips undefined values", async () => {
    const { fetch, calls } = recordingFetch(() => jsonResponse({ data: [], meta: { request_id: "req_1" } }));
    const client = new FinCodeClient(BASE_CONFIG, { fetch, sleep: noSleep });

    await client.get("/banks/search", { q: "Deutsche Bank", country: undefined, limit: 5 });

    const url = new URL(calls[0]?.url ?? "");
    assert.equal(url.searchParams.get("q"), "Deutsche Bank");
    assert.equal(url.searchParams.get("limit"), "5");
    assert.equal(url.searchParams.has("country"), false);
  });

  it("keeps the API error code, message and request id", async () => {
    const { fetch } = recordingFetch(() =>
      jsonResponse(
        { error: { code: "NOT_FOUND", message: "The identifier does not exist", request_id: "req_404" } },
        { status: 404 },
      ),
    );
    const client = new FinCodeClient(BASE_CONFIG, { fetch, sleep: noSleep });

    await assert.rejects(
      () => client.get("/swift/ZZZZZZZZ"),
      (error: unknown) =>
        error instanceof FinCodeApiError &&
        error.code === "NOT_FOUND" &&
        error.status === 404 &&
        error.requestId === "req_404" &&
        error.isInputError,
    );
  });

  it("does not retry a 404", async () => {
    const { fetch, calls } = recordingFetch(() =>
      jsonResponse({ error: { code: "NOT_FOUND", message: "gone" } }, { status: 404 }),
    );
    const client = new FinCodeClient({ ...BASE_CONFIG, maxRetries: 3 }, { fetch, sleep: noSleep });

    await assert.rejects(() => client.get("/swift/ZZZZZZZZ"));
    assert.equal(calls.length, 1);
  });

  it("retries a 429 and succeeds on the second attempt", async () => {
    const { fetch, calls } = recordingFetch((_call, index) =>
      index === 0
        ? jsonResponse({ error: { code: "RATE_LIMITED", message: "slow down" } }, { status: 429 })
        : jsonResponse({ data: { ok: true }, meta: { request_id: "req_2" } }),
    );
    const client = new FinCodeClient({ ...BASE_CONFIG, maxRetries: 1 }, { fetch, sleep: noSleep });

    const result = await client.get<{ ok: boolean }>("/swift/DEUTDEFF");

    assert.equal(result.data.ok, true);
    assert.equal(calls.length, 2);
  });

  it("surfaces a long Retry-After instead of waiting it out", async () => {
    const { fetch, calls } = recordingFetch(() =>
      jsonResponse(
        { error: { code: "RATE_LIMITED", message: "slow down" } },
        { status: 429, headers: { "retry-after": "60" } },
      ),
    );
    const client = new FinCodeClient({ ...BASE_CONFIG, maxRetries: 3 }, { fetch, sleep: noSleep });

    await assert.rejects(
      () => client.get("/swift/DEUTDEFF"),
      (error: unknown) => error instanceof FinCodeApiError && error.retryAfterSeconds === 60,
    );
    assert.equal(calls.length, 1);
  });

  it("reports a timeout as status 0 with code TIMEOUT", async () => {
    const fetch = (async () => {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    }) as unknown as typeof globalThis.fetch;
    const client = new FinCodeClient({ ...BASE_CONFIG, maxRetries: 0 }, { fetch, sleep: noSleep });

    await assert.rejects(
      () => client.get("/swift/DEUTDEFF"),
      (error: unknown) => error instanceof FinCodeApiError && error.code === "TIMEOUT" && error.status === 0,
    );
  });

  it("rejects a 200 body without the envelope", async () => {
    const { fetch } = recordingFetch(() => jsonResponse({ something: "else" }));
    const client = new FinCodeClient(BASE_CONFIG, { fetch, sleep: noSleep });

    await assert.rejects(
      () => client.get("/swift/DEUTDEFF"),
      (error: unknown) => error instanceof FinCodeApiError && error.code === "UNEXPECTED_RESPONSE",
    );
  });
});
