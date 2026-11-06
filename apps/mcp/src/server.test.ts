import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { FinCodeClient } from "./client.js";
import type { McpConfig } from "./config.js";
import { createServer } from "./server.js";

interface TextContent {
  type: string;
  text?: string;
}

interface ToolCallResult {
  content?: TextContent[];
  isError?: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function envelope(data: unknown, requestId = "req_test"): Response {
  return jsonResponse({ data, meta: { request_id: requestId } });
}

function errorResponse(code: string, status: number, message = "failed"): Response {
  return jsonResponse({ error: { code, message, request_id: "req_err" } }, status);
}

interface Harness {
  client: Client;
  urls: string[];
  close: () => Promise<void>;
}

async function connect(
  handler: (url: string) => Response,
  options: { apiKey?: string } = {},
): Promise<Harness> {
  const urls: string[] = [];
  const fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    return handler(url);
  }) as unknown as typeof globalThis.fetch;

  const config: McpConfig = {
    apiKey: options.apiKey,
    baseUrl: "https://api.test/v1",
    timeoutMs: 1_000,
    maxRetries: 0,
  };
  const server = createServer(new FinCodeClient(config, { fetch, sleep: async () => {} }));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);

  return {
    client,
    urls,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

async function call(
  harness: Harness,
  name: string,
  args: Record<string, unknown>,
): Promise<{ payload: Record<string, unknown>; isError: boolean; text: string }> {
  const result = (await harness.client.callTool({ name, arguments: args })) as ToolCallResult;
  const text = result.content?.find((item) => item.type === "text")?.text;
  assert.ok(text, `${name} returned no text content`);
  return {
    payload: JSON.parse(text) as Record<string, unknown>,
    isError: result.isError === true,
    text,
  };
}

describe("MCP server", () => {
  it("publishes one tool per identifier family plus the directory tools", async () => {
    const harness = await connect(() => envelope({}));
    try {
      const { tools } = await harness.client.listTools();
      assert.deepEqual(
        tools.map((tool) => tool.name),
        [
          "lookup_swift_code",
          "lookup_ifsc",
          "lookup_cnaps",
          "lookup_routing_number",
          "lookup_sort_code",
          "lookup_bsb",
          "lookup_bin",
          "validate_iban",
          "lookup_iban",
          "search_banks",
          "get_bank",
          "list_bank_branches",
          "list_countries",
          "get_country",
        ],
      );
      for (const tool of tools) {
        assert.equal(tool.annotations?.readOnlyHint, true);
        assert.ok(tool.description && tool.description.length > 40);
        assert.ok(Object.keys(tool.inputSchema.properties ?? {}).length >= 1);
      }
    } finally {
      await harness.close();
    }
  });

  const CODE_CASES = [
    { tool: "lookup_swift_code", param: "swift_code", input: "deutdeff", path: "/v1/swift/DEUTDEFF", type: "SWIFT" },
    { tool: "lookup_ifsc", param: "ifsc_code", input: "hdfc0000001", path: "/v1/ifsc/HDFC0000001", type: "IFSC" },
    { tool: "lookup_cnaps", param: "cnaps_code", input: "102100099996", path: "/v1/cnaps/102100099996", type: "CNAPS" },
    {
      tool: "lookup_routing_number",
      param: "routing_number",
      input: "021000021",
      path: "/v1/routing/021000021",
      type: "ABA_ROUTING",
    },
    { tool: "lookup_sort_code", param: "sort_code", input: "60-83-71", path: "/v1/sort-code/608371", type: "SORT_CODE" },
    { tool: "lookup_bsb", param: "bsb", input: "062-000", path: "/v1/bsb/062000", type: "BSB" },
    { tool: "lookup_bin", param: "bin", input: "457173", path: "/v1/bin/457173", type: "BIN" },
  ];

  for (const testCase of CODE_CASES) {
    it(`${testCase.tool} calls ${testCase.path} once`, async () => {
      const harness = await connect((url) => {
        assert.equal(url, `https://api.test${testCase.path}`);
        return envelope({ bank: { name_en: "Test Bank" }, city: "Testville" });
      });
      try {
        const { payload, isError } = await call(harness, testCase.tool, { [testCase.param]: testCase.input });
        assert.equal(isError, false);
        assert.equal(payload.found, true);
        assert.equal(payload.type, testCase.type);
        assert.equal(payload.summary, "Test Bank (Testville)");
        assert.deepEqual(payload.meta, { request_id: "req_test" });
        assert.equal(harness.urls.length, 1);
      } finally {
        await harness.close();
      }
    });
  }

  it("treats a missing code as an answer, not a tool failure", async () => {
    const harness = await connect(() => errorResponse("NOT_FOUND", 404));
    try {
      const { payload, isError } = await call(harness, "lookup_sort_code", { sort_code: "999999" });
      assert.equal(isError, false);
      assert.equal(payload.found, false);
      assert.equal(payload.kind, "sort code");
    } finally {
      await harness.close();
    }
  });

  it("reports a malformed code as invalid rather than failing", async () => {
    const harness = await connect(() => errorResponse("INVALID_IFSC", 422, "The code is not a valid IFSC"));
    try {
      const { payload, isError } = await call(harness, "lookup_ifsc", { ifsc_code: "NOPE" });
      assert.equal(isError, false);
      assert.equal(payload.valid, false);
      const error = payload.error as Record<string, unknown>;
      assert.equal(error.code, "INVALID_IFSC");
    } finally {
      await harness.close();
    }
  });

  it("validates an IBAN without an API key", async () => {
    const harness = await connect((url) => {
      assert.match(url, /\/v1\/iban\/validate\?iban=DE89370400440532013000$/);
      return envelope({ valid: true, iban: "DE89370400440532013000", bank_code: "37040044", length: 22 });
    });
    try {
      const { payload, isError } = await call(harness, "validate_iban", {
        iban: "DE89 3704 0044 0532 0130 00",
      });
      assert.equal(isError, false);
      assert.equal(payload.valid, true);
      assert.equal(payload.bank_code, "37040044");
      assert.deepEqual(payload.meta, { request_id: "req_test" });
    } finally {
      await harness.close();
    }
  });

  it("treats an invalid IBAN as an answer, not a tool failure", async () => {
    const harness = await connect(() => errorResponse("INVALID_IBAN", 422, "checksum failed"));
    try {
      const { payload, isError } = await call(harness, "validate_iban", { iban: "DE00370400440532013000" });
      assert.equal(isError, false);
      assert.equal(payload.valid, false);
      const error = payload.error as Record<string, unknown>;
      assert.equal(error.code, "INVALID_IBAN");
    } finally {
      await harness.close();
    }
  });

  it("resolves the bank behind an IBAN and flags an unknown issuer", async () => {
    const harness = await connect((url) => {
      assert.match(url, /\/v1\/iban\/GB82WEST12345698765432$/);
      return envelope({ valid: true, iban: "GB82WEST12345698765432" });
    });
    try {
      const { payload, isError } = await call(harness, "lookup_iban", {
        iban: "GB82 WEST 1234 5698 7654 32",
      });
      assert.equal(isError, false);
      assert.equal(payload.valid, true);
      assert.ok(typeof payload.note === "string" && payload.note.includes("never account existence"));
    } finally {
      await harness.close();
    }
  });

  it("refuses directory tools until an API key is configured", async () => {
    const harness = await connect(() => envelope([]));
    try {
      const { payload, isError } = await call(harness, "search_banks", { query: "Deutsche Bank" });
      assert.equal(isError, true);
      const error = payload.error as Record<string, unknown>;
      assert.equal(error.code, "MISSING_API_KEY");
      assert.equal(harness.urls.length, 0);
    } finally {
      await harness.close();
    }
  });

  it("searches banks with the key and forwards paging parameters", async () => {
    const harness = await connect(
      (url) => {
        assert.match(url, /\/v1\/banks\/search\?q=Deutsche\+Bank&country=DE&limit=5$/);
        return jsonResponse({
          data: [{ id: "inst_1", name_en: "Deutsche Bank", country: "DE" }],
          meta: { request_id: "req_banks", next_cursor: "cursor-2" },
        });
      },
      { apiKey: "sk_test" },
    );
    try {
      const { payload, isError } = await call(harness, "search_banks", {
        query: "Deutsche Bank",
        country: "DE",
        limit: 5,
      });
      assert.equal(isError, false);
      assert.equal(payload.count, 1);
      assert.deepEqual(payload.meta, { request_id: "req_banks", next_cursor: "cursor-2" });
    } finally {
      await harness.close();
    }
  });

  it("resolves a bank by slug or by public id", async () => {
    const slugHarness = await connect((url) => {
      assert.match(url, /\/v1\/banks\/by-slug\/hdfc-bank$/);
      return envelope({ id: "inst_2", name_en: "HDFC Bank" });
    }, { apiKey: "sk_test" });
    try {
      const { payload } = await call(slugHarness, "get_bank", { bank: "hdfc-bank" });
      assert.equal(payload.name_en, "HDFC Bank");
    } finally {
      await slugHarness.close();
    }

    const id = "inst_4";
    const idHarness = await connect((url) => {
      assert.match(url, new RegExp(`/v1/banks/${id}$`));
      return envelope({ id, name_en: "Deutsche Bank" });
    }, { apiKey: "sk_test" });
    try {
      const { payload } = await call(idHarness, "get_bank", { bank: id });
      assert.equal(payload.name_en, "Deutsche Bank");
    } finally {
      await idHarness.close();
    }
  });

  it("filters countries locally and excludes non-IBAN ones", async () => {
    const harness = await connect(
      () =>
        jsonResponse({
          data: [
            { country_code: "DE", name_en: "Germany", iban_supported: true },
            { country_code: "US", name_en: "United States", iban_supported: false },
          ],
          meta: { request_id: "req_countries" },
        }),
      { apiKey: "sk_test" },
    );
    try {
      const { payload } = await call(harness, "list_countries", { iban_only: true });
      assert.equal(payload.count, 1);
      assert.deepEqual(payload.countries, [
        { country_code: "DE", name_en: "Germany", iban_supported: true },
      ]);
    } finally {
      await harness.close();
    }
  });

  it("attaches the IBAN layout when the country uses IBAN", async () => {
    const harness = await connect(
      (url) => {
        if (url.includes("/iban-format")) {
          return envelope({ country_code: "DE", iban_length: 22, example: "DE89370400440532013000" });
        }
        assert.match(url, /\/v1\/countries\/DE$/);
        return envelope({ country_code: "DE", name_en: "Germany", iban_supported: true });
      },
      { apiKey: "sk_test" },
    );
    try {
      const { payload } = await call(harness, "get_country", { country_code: "de" });
      const format = payload.iban_format as Record<string, unknown>;
      assert.equal(format.iban_length, 22);
    } finally {
      await harness.close();
    }
  });
});
