# Plaid

Cursor plugin that connects agents to [Plaid](https://plaid.com) through Plaid's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server, the **Dashboard MCP server**.

Debug Items and broken bank connections, review Link conversion data, and check API usage and product metrics for your Plaid integration — the same Production diagnostics and analytics that live in the Plaid Dashboard.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Plaid**.
3. Click **Install**, then complete the Plaid Dashboard sign-in prompt.

Or run `/add-plugin plaid` in chat.

## MCP

```json
{
  "mcpServers": {
    "plaid": {
      "type": "http",
      "url": "https://api.dashboard.plaid.com/mcp/"
    }
  }
}
```

The server speaks Streamable HTTP. Plaid also serves a legacy SSE endpoint at `https://api.dashboard.plaid.com/mcp/sse`; this plugin uses the Streamable HTTP URL from Plaid's current docs.

## Auth

Auth is OAuth 2.0 against the Plaid Dashboard. Every request to the server must carry `Authorization: Bearer <access_token>`, and tool calls are scoped to what the signed-in Dashboard user can already see. Plaid documents two ways to get that token:

- **Interactive (MCP clients and hosted assistants).** Add the server URL and sign in to the Plaid Dashboard when prompted. This is the flow this plugin is packaged for.
- **Machine-to-machine (backend / model-provider APIs).** Call `POST https://production.plaid.com/oauth/token` with `grant_type: client_credentials` and `scope: mcp:dashboard` using your Plaid `client_id` and Production secret, then pass the resulting short-lived access token (15-minute TTL, with refresh token) as the bearer header. This path is for servers, not for the plugin.

> **Note on Cursor OAuth wiring.** This plugin only packages the server definition; it does not bundle an OAuth client ID or secret. Cursor attempts OAuth (including Dynamic Client Registration) when the server returns `401`. If Plaid requires a pre-registered OAuth client for third-party MCP clients, Cursor's static OAuth path (`auth.CLIENT_ID` / `auth.CLIENT_SECRET` on the server entry) or backend wiring will need to be set up separately with credentials issued by Plaid. Do not paste your Plaid API secret into `mcp.json`.

## Before you connect

- You need a Plaid account with **Production** access and at least one product approved for Production. The Dashboard MCP server does not operate on Sandbox data.
- Data access follows your Dashboard role and team permissions.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Items | Diagnose Items and broken bank connections, look up Item status and error details |
| Link | Review Link conversion data and funnel drop-off |
| Usage | Check API request volumes, product usage, and usage trends |
| Teams | List the teams the signed-in user belongs to |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The Dashboard MCP server is read-only: it surfaces diagnostics and analytics and cannot move money, create Items, or change your integration.
- This is Plaid's **Dashboard** MCP server for operating an existing Plaid integration. Plaid separately ships a local, stdio-based Sandbox MCP server (`mcp-server-plaid`) in its AI coding toolkit for building integrations against Sandbox data; that server is not part of this plugin.
- Plaid may change the tool catalog; check the docs for the current list.

## Docs

- Dashboard MCP server: https://plaid.com/docs/resources/mcp/
- OAuth token endpoint (`/oauth/token`): https://plaid.com/docs/api/oauth/
- AI coding toolkit (local Sandbox MCP server): https://github.com/plaid/ai-coding-toolkit
- Server URL: https://api.dashboard.plaid.com/mcp/

Logo is Plaid's lattice mark, redrawn as vector geometry and placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT
