import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FinCodeClient } from "../client.js";
import { FinCodeApiError } from "../errors.js";
import { failure, jsonResult, notFound, withMeta, missingApiKey } from "./shared.js";

interface CountryRecord {
  country_code: string;
  iso3?: string;
  name_en?: string;
  name_local?: string;
  currency_code?: string;
  iban_supported?: boolean | null;
  swift_supported?: boolean | null;
  local_identifier_type?: string | null;
  status?: string;
}

export function registerReferenceTools(server: McpServer, client: FinCodeClient): void {
  server.registerTool(
    "list_countries",
    {
      title: "List countries in the directory",
      description:
        "Country reference data: ISO codes, currency, whether the country participates in IBAN, and which national identifier it uses (SORT_CODE, BSB, IFSC, CNAPS, ABA_ROUTING). Filter locally by name or ISO code, or to IBAN countries only. Requires FINCODE_API_KEY.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Case-insensitive match on country name, ISO2 or ISO3 code, e.g. 'germany', 'DE', 'AUS'."),
        iban_only: z.boolean().optional().describe("Return only countries that participate in IBAN."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query, iban_only }) => {
      if (!client.authenticated) return missingApiKey("list_countries");
      try {
        const result = await client.get<CountryRecord[]>("/countries");
        const needle = query?.trim().toLowerCase();
        const countries = result.data.filter((country) => {
          if (iban_only === true && country.iban_supported !== true) return false;
          if (!needle) return true;
          return [country.country_code, country.iso3, country.name_en, country.name_local].some(
            (field) => typeof field === "string" && field.toLowerCase().includes(needle),
          );
        });

        return jsonResult(
          withMeta({ found: countries.length > 0, count: countries.length, countries }, result),
        );
      } catch (error) {
        return failure(error, { query });
      }
    },
  );

  server.registerTool(
    "get_country",
    {
      title: "Get one country, with its IBAN format",
      description:
        "Fetch a country's reference record plus, for IBAN countries, the national IBAN format: total length, BBAN structure, the bank-code position and an example IBAN. Use this to explain how an IBAN is composed or to build a test IBAN. Requires FINCODE_API_KEY.",
      inputSchema: {
        country_code: z.string().length(2).describe("ISO 3166-1 alpha-2 code, e.g. DE, GB, IN."),
        include_iban_format: z
          .boolean()
          .optional()
          .describe("Fetch the IBAN format as well (default true; only applies to IBAN countries)."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ country_code, include_iban_format }) => {
      if (!client.authenticated) return missingApiKey("get_country");
      const code = country_code.trim().toUpperCase();

      try {
        const country = await client.get<CountryRecord>(`/countries/${encodeURIComponent(code)}`);
        const wantsFormat = include_iban_format !== false && country.data.iban_supported === true;

        if (!wantsFormat) {
          return jsonResult(withMeta({ found: true, ...country.data }, country));
        }

        const format = await client.get<Record<string, unknown>>(
          `/countries/${encodeURIComponent(code)}/iban-format`,
        );
        return jsonResult(
          withMeta(
            {
              found: true,
              ...country.data,
              iban_format: format.data,
            },
            format,
          ),
        );
      } catch (error) {
        if (error instanceof FinCodeApiError && error.code === "NOT_FOUND") {
          return notFound("country", code, error);
        }
        return failure(error, { country_code: code });
      }
    },
  );
}
