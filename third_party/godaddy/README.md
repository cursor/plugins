# GoDaddy

Cursor plugin that connects agents to [GoDaddy](https://www.godaddy.com) through GoDaddy's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Brainstorm domain names, check availability and pricing in bulk, and get registration links — all from public domain data.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **GoDaddy**.
3. Click **Install**. There is no sign-in step.

Or run `/add-plugin godaddy` in chat.

## MCP

```json
{
  "mcpServers": {
    "godaddy": {
      "type": "http",
      "url": "https://api.godaddy.com/v1/domains/mcp"
    }
  }
}
```

No auth. GoDaddy's domain MCP server uses public domain data only, so there is no account, API key, or sign-in step. It is rate-limited per client IP.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Availability | Check one domain or up to 1,000 at a time, with pricing and registration links |
| Suggestions | Generate alternative domain names from keywords or a business description |

The hosted runtime is the source of truth for tool names and schemas. Call `domains_check_availability` as a read-only smoke test after connecting.

## Notes

- The server is strictly read-only over public data. It cannot register or transfer domains, change DNS, or make purchases.
- Because there is no account context, it cannot see or manage domains you already own.
- Community `godaddy-mcp` packages that ask for `GODADDY_API_KEY` are unrelated third-party projects wrapping the REST API — this plugin uses GoDaddy's own hosted endpoint.

## Docs

- GoDaddy MCP server: https://developer.godaddy.com/en/docs/api-users/mcp
- Server URL: https://api.godaddy.com/v1/domains/mcp

Logo is GoDaddy's official mark, from the `godaddy` GitHub organization.

## License

MIT
