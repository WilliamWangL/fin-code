/**
 * End-to-end smoke test against the real API over stdio.
 *
 *   npm run build && npm run smoke
 *
 * It spawns the built server exactly as an MCP client would, lists the tools
 * and performs four keyless identifier lookups. Four calls keep the anonymous
 * budget (10 requests per minute per IP) intact; set FINCODE_API_KEY to check
 * the directory tools as well.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface TextContent {
  type: string;
  text?: string;
}

function preview(result: unknown): string {
  const content = (result as { content?: TextContent[] }).content;
  const text = content?.find((item) => item.type === "text")?.text ?? "(no content)";
  return text.length > 600 ? `${text.slice(0, 600)}\n  … truncated` : text;
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/index.js"],
    env: { ...process.env } as Record<string, string>,
    stderr: "inherit",
  });
  const client = new Client({ name: "fincode-mcp-smoke", version: "0.0.0" });
  await client.connect(transport);

  try {
    const { tools } = await client.listTools();
    console.log(`tools/list -> ${tools.length} tools: ${tools.map((tool) => tool.name).join(", ")}`);

    const iban = await client.callTool({
      name: "validate_iban",
      arguments: { iban: "DE89 3704 0044 0532 0130 00" },
    });
    console.log("\nvalidate_iban DE89370400440532013000 ->");
    console.log(preview(iban));

    const swift = await client.callTool({
      name: "lookup_swift_code",
      arguments: { swift_code: "DEUTDEFF" },
    });
    console.log("\nlookup_swift_code DEUTDEFF ->");
    console.log(preview(swift));

    const ibanLookup = await client.callTool({
      name: "lookup_iban",
      arguments: { iban: "GB82 WEST 1234 5698 7654 32" },
    });
    console.log("\nlookup_iban 'GB82 WEST 1234 5698 7654 32' ->");
    console.log(preview(ibanLookup));

    const bsb = await client.callTool({
      name: "lookup_bsb",
      arguments: { bsb: "062-000" },
    });
    console.log("\nlookup_bsb '062-000' ->");
    console.log(preview(bsb));

    if (process.env.FINCODE_API_KEY) {
      const search = await client.callTool({
        name: "search_banks",
        arguments: { query: "Deutsche Bank", limit: 3 },
      });
      console.log("\nsearch_banks 'Deutsche Bank' ->");
      console.log(preview(search));
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("smoke failed:", error);
  process.exit(1);
});
