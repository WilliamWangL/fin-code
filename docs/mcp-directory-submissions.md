# MCP directory submissions

Copy-paste material for listing `fincode-mcp` in MCP registries and directories.
Update the install command once the package is on npm; until then use the release
tarball, which every `mcp-v*` tag produces.

## Identity

| Field | Value |
| --- | --- |
| Name | `fincode-mcp` |
| Display name | FinCode bank data |
| Repository | https://github.com/WilliamWangL/fin-code (server lives in `apps/mcp`) |
| Docs | https://fincode.ecommica.com/docs/mcp-server |
| Website | https://fincode.ecommica.com |
| License | MIT |
| Runtime | Node.js 18+, stdio transport |
| Transport | stdio (local process) |
| Auth | optional API key; identifier lookups work without one |

## Descriptions

Short (registry `description`, ≤100 chars):

```
Look up SWIFT, IBAN, IFSC, CNAPS, sort code, BSB, routing and BIN codes, and search banks.
```

Long (directory listings, ~55 words):

```
FinCode exposes a global banking directory over MCP: 14 read-only tools that resolve
SWIFT/BIC, IBAN, Indian IFSC, Chinese CNAPS, US ABA routing, UK/Ireland sort codes,
Australian BSB and card BINs to their institutions, plus bank search, branch lists and
country/IBAN reference data. Identifier lookups work without an API key.
```

中文（如目录支持中文简介）：

```
FinCode 银行数据 MCP：14 个只读工具，可解析 SWIFT/BIC、IBAN、印度 IFSC、中国 CNAPS、
美国 ABA routing、英国/爱尔兰 sort code、澳洲 BSB 与卡 BIN，并支持银行搜索、分行列表
与国家/IBAN 参考数据。标识符查询无需 API Key。
```

Categories / tags: `finance`, `banking`, `payments`, `data`, `developer-tools`, `lookup`,
`iban`, `swift`, `bank-codes`.

## Install commands

Current (release tarball, no npm account):

```bash
npx -y -p https://github.com/WilliamWangL/fin-code/releases/download/mcp-v0.1.0/fincode-mcp-0.1.0.tgz -- fincode-mcp
```

Cursor config:

```json
{
  "mcpServers": {
    "fincode": {
      "command": "npx",
      "args": ["-y", "-p", "https://github.com/WilliamWangL/fin-code/releases/download/mcp-v0.1.0/fincode-mcp-0.1.0.tgz", "--", "fincode-mcp"],
      "env": { "FINCODE_API_KEY": "sk_live_..." }
    }
  }
}
```

Claude Code:

```bash
claude mcp add fincode --env FINCODE_API_KEY=sk_live_... -- npx -y -p https://github.com/WilliamWangL/fin-code/releases/download/mcp-v0.1.0/fincode-mcp-0.1.0.tgz -- fincode-mcp
```

After the npm release, replace the `-p <tarball>` pair with nothing and use
`npx -y fincode-mcp`.

## Environment variables

| Variable | Required | Secret | Default |
| --- | --- | --- | --- |
| `FINCODE_API_KEY` | no | yes | unset (keyless mode) |
| `FINCODE_API_BASE_URL` | no | no | `https://api.ecommica.com/v1` |
| `FINCODE_MCP_TIMEOUT_MS` | no | no | `15000` |
| `FINCODE_MCP_MAX_RETRIES` | no | no | `1` |

## Tools (for directory listings)

`lookup_swift_code`, `lookup_iban`, `validate_iban`, `lookup_ifsc`, `lookup_cnaps`,
`lookup_routing_number`, `lookup_sort_code`, `lookup_bsb`, `lookup_bin`,
`search_banks`, `get_bank`, `list_bank_branches`, `list_countries`, `get_country`.

## Channels

| Channel | Where | Needs npm first | How |
| --- | --- | --- | --- |
| Official MCP Registry | https://registry.modelcontextprotocol.io | yes | `server.json` is committed in `apps/mcp`; publish with the `mcp-publisher` CLI, namespace `io.github.williamwangl` verified through GitHub |
| Smithery | https://smithery.ai | yes | publish from the npm package; add a `smithery.yaml` if the form requires one |
| Glama | https://glama.ai/mcp/servers | no | indexes public GitHub repositories; claim the listing to edit the description |
| mcp.so | https://mcp.so | no | submit form with the repository URL and the install command |
| PulseMCP | https://www.pulsemcp.com | no | submit form; they also run a weekly newsletter |
| Cursor Directory | https://cursor.directory | no | submit form; paste the Cursor JSON above |
| awesome-mcp-servers | https://github.com/punkpeye/awesome-mcp-servers | no | one-line PR under the finance/data section |

## GitHub repository topics

Set once under the repository's About panel — Glama and several aggregators crawl them:

```
mcp, mcp-server, model-context-protocol, banking, bank-data, iban, swift-code,
bic, ifsc, cnaps, sort-code, bsb, routing-number, bin-lookup, fintech
```

## Verifying a listing

```bash
# Official registry
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=fincode" | head -40

# Package presence after the npm release
npm view fincode-mcp version --registry=https://registry.npmjs.org
```

Indexing on community directories usually takes a day or two. Keep the description,
tool list and install command identical across listings so search results stay consistent.
