# Mercury

Cursor plugin that connects agents to [Mercury](https://mercury.com) through Mercury's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Answer questions about a Mercury business banking account — balances, transactions, statements, cards, and recipients — without exposing any way to move money.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Mercury**.
3. Click **Install**, then complete the Mercury sign-in prompt.

Or run `/add-plugin mercury` in chat.

## MCP

```json
{
  "mcpServers": {
    "mercury": {
      "type": "http",
      "url": "https://mcp.mercury.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with Dynamic Client Registration and PKCE. Cursor registers itself and prompts for Mercury sign-in when the plugin connects — there is no API key or client ID to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Account details and current balances |
| Transactions | Transaction reporting with category, merchant, user, and card metadata |
| Statements | Retrieve account statements as PDFs |
| Cards & recipients | Card details and recipient/payee records |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server is strictly read-only. It cannot initiate transactions or modify account data.
- The OAuth scope is `read`, plus `offline_access` if the client wants refresh without another browser round-trip. PKCE with `S256` is required — `plain` is rejected.
- Mercury labels the MCP server as beta.
- Mercury's own security guidance is to check the endpoint domain before installing from any marketplace. This plugin points at `https://mcp.mercury.com/mcp`, which is the URL in Mercury's docs.

## Docs

- What is Mercury MCP: https://docs.mercury.com/docs/what-is-mercury-mcp
- Connecting Mercury MCP: https://docs.mercury.com/docs/connecting-mercury-mcp
- Supported tools: https://docs.mercury.com/docs/supported-tools-on-mercury-mcp
- Server URL: https://mcp.mercury.com/mcp

Logo is Mercury's official mark, from the `mercury` GitHub organization.

## License

MIT
