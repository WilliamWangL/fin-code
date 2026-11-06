# fincode-mcp

An MCP (Model Context Protocol) server that exposes the [FinCode](https://fincode.ecommica.com) global banking directory to AI coding tools. Ask Cursor or Claude Code "which bank is IBAN GB82WEST12345698765432?" or "validate this IFSC before I write the seed data" and the model answers from the same dataset the API serves — no copy-pasted CSVs, no invented bank names.

- Fourteen tools over stdio: one per identifier family (SWIFT, IBAN, IFSC, CNAPS, ABA routing, sort code, BSB, card BIN), IBAN validation, and the bank, branch and country directory.
- Each identifier tool takes a single semantically named argument (`swift_code`, `routing_number`, `sort_code`, ...), so the model picks the tool by name instead of routing a value through a detector.
- Works **without an API key** for the nine public identifier tools (10 requests per minute per IP); an API key in `FINCODE_API_KEY` unlocks the directory tools and plan-level limits.
- Zero configuration beyond `npx`: Node 18+, no install step, no local data. Install from npm or from the tarball attached to each `mcp-v*` GitHub Release.

## Quick start

Two install sources, same server:

- **npm** — `npx -y fincode-mcp`, once the package is published.
- **GitHub Release** — the tarball attached to every `mcp-v*` tag; works today and needs no npm account or registry access.

Both run locally over stdio. Pass `FINCODE_API_KEY` in `env` to unlock the directory tools; without it the server runs keyless.

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "fincode": {
      "command": "npx",
      "args": ["-y", "fincode-mcp"],
      "env": { "FINCODE_API_KEY": "sk_live_..." }
    }
  }
}
```

Before the first npm release, point `args` at the release tarball instead:

```json
"args": ["-y", "-p", "https://github.com/WilliamWangL/fin-code/releases/download/mcp-v0.1.0/fincode-mcp-0.1.0.tgz", "--", "fincode-mcp"]
```

On Windows, Cursor sometimes needs the call wrapped: `"command": "cmd"`, `"args": ["/c", "npx", ...]`.

### Claude Code

```bash
claude mcp add fincode --env FINCODE_API_KEY=sk_live_... -- npx -y fincode-mcp

# from the GitHub Release tarball
claude mcp add fincode --env FINCODE_API_KEY=sk_live_... -- npx -y -p https://github.com/WilliamWangL/fin-code/releases/download/mcp-v0.1.0/fincode-mcp-0.1.0.tgz -- fincode-mcp
```

### Claude Desktop

Add the same `mcpServers` block as above to `claude_desktop_config.json`.

Drop the `env` block to run keyless: identifier lookups keep working, the directory tools answer with a `MISSING_API_KEY` hint until a key is configured. Create a key at [fincode.ecommica.com/register](https://fincode.ecommica.com/register).

## Tools

| Tool | What it does | API key |
| --- | --- | --- |
| `lookup_swift_code` | SWIFT/BIC code to institution, city and code layout. | no |
| `lookup_iban` | Validate an IBAN and resolve the issuing institution (name, SWIFT/BIC, city). | no |
| `validate_iban` | Format, country, length, structure and MOD-97 checksum; parses the bank code and account number. | no |
| `lookup_ifsc` | Indian IFSC to bank branch, with the 9-digit MICR when published. | no |
| `lookup_cnaps` | Chinese CNAPS code to bank branch and 3-digit bank code. | no |
| `lookup_routing_number` | US ABA routing number with the checksum verdict, city and state. | no |
| `lookup_sort_code` | UK/Ireland 6-digit sort code to bank branch. | no |
| `lookup_bsb` | Australian 6-digit BSB to bank branch, city and state. | no |
| `lookup_bin` | 6-8 digit card BIN/IIN to issuer, brand, type and country. | no |
| `search_banks` | Full-text search over institutions, with the identifiers each bank carries. | yes |
| `get_bank` | One institution by id (`inst_...`) or slug: identifiers, website, branch count. | yes |
| `list_bank_branches` | Cursor-paginated branches, filterable by text or city. | yes |
| `list_countries` | Country reference data, filterable by name/code or IBAN participation. | yes |
| `get_country` | One country plus its national IBAN layout and an example IBAN. | yes |

Each identifier family has its own tool, and each takes a single semantically named argument (`swift_code`, `routing_number`, `sort_code`, ...). Six digits fit a UK/Ireland sort code, an Australian BSB and a card BIN, so the tool choice carries the interpretation: pick by the user's country instead of trying all three.

Every tool answers with one JSON document. Successful lookups carry `meta.request_id`; a value that is not in the dataset returns `found: false` instead of failing the call.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `FINCODE_API_KEY` | unset | Key with the `sk_` prefix, sent as `Authorization: Bearer`. Optional. |
| `FINCODE_API_BASE_URL` | `https://api.ecommica.com/v1` | API root including `/v1`. Point it at a self-hosted instance if needed. |
| `FINCODE_MCP_TIMEOUT_MS` | `15000` | Per-attempt timeout; a timeout is retried once. |
| `FINCODE_MCP_MAX_RETRIES` | `1` | Retries after the first attempt for `429`, `502`, `503`, `504` and network errors. |

## Errors

API failures surface as `error.code` with the API's `request_id`:

| Code | Meaning | What to do |
| --- | --- | --- |
| `MISSING_API_KEY` | A directory tool was called without a key. | Set `FINCODE_API_KEY` and restart the server. |
| `UNAUTHORIZED` / `API_KEY_EXPIRED` | The key is missing, invalid or revoked. | Issue a new key in the dashboard. |
| `QUOTA_EXCEEDED` | The plan's monthly quota is exhausted. | Upgrade the plan or wait for the next period. |
| `RATE_LIMITED` | Too many requests. Keyless calls share 10 per minute per IP. | Retry after the `retry_after_seconds` hint, or use an API key. |
| `NOT_FOUND` | The value is not in the dataset. | Not a failure — report it as unknown data. |
| `INVALID_IBAN`, `INVALID_SWIFT`, ... | Validation failed for that identifier type. | Fix the input; the message names the rule. |

Transport and quota failures set `isError: true`; identifier verdicts do not.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # node:test, no network access
npm run build       # dist/ with the executable entry point
npm run smoke       # spawns dist/index.js and calls the real API
```

The package lives in the FinCode monorepo at `apps/mcp`; the API contract it targets is documented at [fincode.ecommica.com/docs](https://fincode.ecommica.com/docs).

## Releasing

Two workflows, both keyed to the version in `package.json`:

- `release-mcp.yml` runs on every `mcp-v*` tag, builds the package and attaches the tarball to a GitHub Release. No npm account needed, so this is the channel while the package is unpublished.
- `publish-mcp.yml` publishes to npm through Trusted Publishing (OIDC). It runs manually and needs a one-time binding on npmjs.com: organization `WilliamWangL`, repository `fin-code`, workflow `publish-mcp.yml`. npm restricts tokens that bypass 2FA (account changes since Aug 2026, direct publishing from Jan 2027), so the workflow carries no `NPM_TOKEN` secret. After the upload it publishes `server.json` to the official MCP Registry with the same GitHub OIDC token.

```bash
cd apps/mcp
npm version patch --no-git-tag-version
version="$(node -p "require('./package.json').version")"
git commit -am "chore(mcp): release $version"
git tag "mcp-v$version"
git push origin main --tags
```

## Name

`fincode-mcp` shares a name with an unrelated MCP server for the Japanese payment gateway fincode byGMO. This package is the FinCode bank data server and has no connection to them. The npm package name is free; the GitHub namespace `io.github.williamwangl/fincode-mcp` keeps both listings distinct in the official registry.

## License

MIT, see [LICENSE](LICENSE). The MCP server is a client of the FinCode API, licensed like the `fincode-*` SDKs. The rest of the repository stays under the [FinCode Source-Available License](https://github.com/WilliamWangL/fin-code/blob/main/LICENSE), which grants no right to redistribute or resell the service.
