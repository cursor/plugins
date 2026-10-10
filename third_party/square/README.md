# Square

Cursor plugin that connects agents to [Square](https://squareup.com) through Square's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server, hosted by Block.

Query and manage a Square seller account — payments, orders, catalog items, inventory, customers, invoices, and more — through the Square API.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Square**.
3. Click **Install**, then complete the Square sign-in prompt.

Or run `/add-plugin square` in chat.

## MCP

```json
{
  "mcpServers": {
    "square": {
      "type": "http",
      "url": "https://mcp.squareup.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with Dynamic Client Registration and PKCE. Cursor registers itself and prompts for Square sign-in when the plugin connects — there is no access token or client ID to configure. Square lets you approve only the permission scopes you want the connection to have.

## What agents can do

The server exposes a small, generic tool set that reaches the full Square API:

| Tool | Purpose |
| --- | --- |
| `get_service_info` | Discover the methods available on a Square service (for example `catalog`, `orders`, `payments`) |
| `get_type_info` | Get the parameter requirements for a method before calling it |
| `make_api_request` | Execute a Square API call |

Through those tools agents can reach payments and refunds, orders, catalog and inventory, customers and loyalty, invoices and subscriptions, bookings, team members and timecards, gift cards, disputes, payouts, and more — limited to the scopes you approve.

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The remote server reaches **production** data only. To test against a Square Sandbox account, run Square's local server instead (`npx square-mcp-server start` with `ACCESS_TOKEN` and `SANDBOX=true`); see Square's docs.
- The server can write as well as read — including creating orders, payments, refunds, and invoices — when the matching `*_WRITE` scopes are approved. Approve only the scopes you need, and grant read-only scopes if agents should not change seller data.
- Square labels the MCP server as beta.
- Square maintains an allowlist of MCP clients for OAuth registration. If sign-in is rejected for an unregistered client, request an addition in the Square developer forum.

## Docs

- Square MCP server: https://developer.squareup.com/docs/mcp
- Source: https://github.com/square/square-mcp-server
- OAuth permissions reference: https://developer.squareup.com/docs/oauth-api/square-permissions
- Server URL: https://mcp.squareup.com/mcp

Logo is Square's official mark, from the `square` GitHub organization.

## License

MIT
