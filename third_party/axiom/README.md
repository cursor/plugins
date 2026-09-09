# Axiom

Cursor plugin that connects agents to [Axiom](https://axiom.co/docs/console/intelligence/mcp-server) through Axiom's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query logs, traces, and metrics with APL and manage monitors.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Axiom**.
3. Click **Install**, then complete the Axiom sign-in prompt.

Or run `/add-plugin axiom` in chat.

## MCP

```json
{
  "mcpServers": {
    "axiom": {
      "type": "http",
      "url": "https://mcp.axiom.co/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Axiom sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need an Axiom account. The hosted server works on all plans and runs queries through Axiom's US infrastructure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Datasets | List datasets, inspect schemas, and run APL queries |
| Metrics | List metrics and tags and run MPL queries |
| Monitors | Check monitor status and alert history; create, update, and delete monitors and notifiers |
| Dashboards | List, export, create, update, and delete dashboards |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Axiom user who authorizes the connection. Revoke access from **Settings → Profile** in the Axiom console.
- Axiom's older local (stdio) servers on GitHub are deprecated; Axiom directs all clients to the hosted server above.

## Docs

- Axiom MCP server: https://axiom.co/docs/console/intelligence/mcp-server
- Server URL: https://mcp.axiom.co/mcp

Logo is Axiom's official mark, from the `axiomhq` GitHub organization.

## License

MIT
