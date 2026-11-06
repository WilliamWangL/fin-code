import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FinCodeClient } from "../client.js";
import { FinCodeApiError } from "../errors.js";
import { failure, jsonResult, notFound, withMeta, missingApiKey } from "./shared.js";

/** Public institution ids are prefixed with `inst_` (see IdentifierMapper in apps/api). */
const INSTITUTION_ID = /^inst_[A-Za-z0-9]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIMIT = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe("Page size, 1-100. The API returns 20 by default.");

const COUNTRY = z
  .string()
  .length(2)
  .optional()
  .describe("ISO 3166-1 alpha-2 country filter, e.g. DE, GB, IN.");

export function registerBankTools(server: McpServer, client: FinCodeClient): void {
  server.registerTool(
    "search_banks",
    {
      title: "Search the bank directory",
      description:
        "Full-text search over the FinCode institution directory by name, short name or local name. Returns institution ids, countries and the identifiers each bank carries, which is the fastest way to find a bank's SWIFT/BIC, routing number, sort code, IFSC or BSB before calling a typed lookup. Requires FINCODE_API_KEY.",
      inputSchema: {
        query: z.string().min(1).describe("Bank name or fragment, e.g. 'Deutsche Bank', 'HDFC', 'Commonwealth'."),
        country: COUNTRY,
        limit: LIMIT,
        cursor: z.string().optional().describe("Value of meta.next_cursor from the previous page."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query, country, limit, cursor }) => {
      if (!client.authenticated) return missingApiKey("search_banks");
      try {
        const result = await client.get<unknown[]>("/banks/search", { q: query, country, limit, cursor });
        return jsonResult(
          withMeta(
            {
              found: result.data.length > 0,
              count: result.data.length,
              banks: result.data,
            },
            result,
          ),
        );
      } catch (error) {
        return failure(error, { query, country });
      }
    },
  );

  server.registerTool(
    "get_bank",
    {
      title: "Get a bank record",
      description:
        "Fetch one institution by public id (inst_...) or by its website slug, including every identifier attached to it and the branch count. Use the slug form for human-facing names such as 'deutsche-bank'. Requires FINCODE_API_KEY.",
      inputSchema: {
        bank: z
          .string()
          .min(1)
          .describe("Institution id from search_banks (e.g. 'inst_4') or a slug (e.g. 'hdfc-bank')."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bank }) => {
      if (!client.authenticated) return missingApiKey("get_bank");
      const identifier = bank.trim();
      const path =
        INSTITUTION_ID.test(identifier) || UUID.test(identifier)
          ? `/banks/${encodeURIComponent(identifier)}`
          : `/banks/by-slug/${encodeURIComponent(identifier)}`;
      try {
        const result = await client.get<Record<string, unknown>>(path);
        return jsonResult(withMeta({ found: true, ...result.data }, result));
      } catch (error) {
        if (error instanceof FinCodeApiError && error.code === "NOT_FOUND") {
          return notFound("bank", identifier, error);
        }
        return failure(error, { bank: identifier });
      }
    },
  );

  server.registerTool(
    "list_bank_branches",
    {
      title: "List a bank's branches",
      description:
        "Page through the physical branches of one institution, optionally filtered by free-text query or city. Branch rows carry the national branch code (BSB, CNAPS, ...) when the import linked one. Requires FINCODE_API_KEY.",
      inputSchema: {
        bank_id: z.string().min(1).describe("Institution id from search_banks or get_bank, e.g. 'inst_4'."),
        query: z.string().optional().describe("Free-text search across branch name and address."),
        city: z.string().optional().describe("City filter."),
        limit: LIMIT,
        cursor: z.string().optional().describe("Value of meta.next_cursor from the previous page."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bank_id, query, city, limit, cursor }) => {
      if (!client.authenticated) return missingApiKey("list_bank_branches");
      try {
        const result = await client.get<unknown[]>(
          `/banks/${encodeURIComponent(bank_id)}/branches`,
          { q: query, city, limit, cursor },
        );
        return jsonResult(
          withMeta({ found: result.data.length > 0, count: result.data.length, branches: result.data }, result),
        );
      } catch (error) {
        if (error instanceof FinCodeApiError && error.code === "NOT_FOUND") {
          return notFound("bank", bank_id, error);
        }
        return failure(error, { bank_id });
      }
    },
  );
}
