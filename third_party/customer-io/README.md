# Customer.io

Cursor plugin that connects agents to [Customer.io](https://customer.io) through Customer.io's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Inspect workspace data, build and manage campaigns and one-time sends, work with segments and people, and query the Journeys and Data Pipelines APIs in the signed-in Customer.io workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Customer.io**.
3. Click **Install**, then complete the Customer.io sign-in prompt.

Or run `/add-plugin customer-io` in chat.

## MCP

```json
{
  "mcpServers": {
    "customer-io": {
      "type": "http",
      "url": "https://mcp.customer.io/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE and Dynamic Client Registration. Cursor registers itself and prompts for Customer.io sign-in when the plugin connects — there is no API key or client ID to configure. During the flow you choose which workspaces and scopes to grant.

## Before you connect

A Customer.io account admin has to turn MCP on first under **Settings → AI**, including the separate toggles for editing live data and reading sensitive data. Until that happens the connection will fail at authorization.

This plugin points at the **US** region. If your account is in the EU, change the server URL to `https://mcp-eu.customer.io/mcp`.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Workspace context | Prime the agent with workspace structure, then browse object and attribute schemas |
| People & objects | Look up people, objects, and their attributes, relationships, and activity |
| Segments | Create, inspect, and query segments and their membership |
| Campaigns & sends | Build and manage campaigns, newsletters, and one-time sends |
| Data pipelines | Query CDP sources, destinations, and delivery data |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Customer.io user who authorizes the connection and are scoped to the workspaces granted during OAuth.
- The tool surface is deliberately small: rather than one tool per object, the server exposes a context primer, a schema browser, and verb-scoped API proxies that keep reads separate from writes and deletes so read tools can be auto-approved.
- Set the transport type to `http`. Customer.io does not support the `sse` transport.
- EU-region accounts must use `https://mcp-eu.customer.io/mcp`; the US URL will not serve EU data.

## Docs

- Customer.io MCP: https://docs.customer.io/ai/mcp/
- Connect an IDE: https://docs.customer.io/ai/mcp/ide/
- Server URL: https://mcp.customer.io/mcp

Logo is Customer.io's official mark, from the `customerio` GitHub organization.

## License

MIT
