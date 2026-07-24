# Gong plugin

Gong MCP integration for revenue intelligence. Connects Cursor to Gong's official hosted MCP server for account summaries, deal insights, and call briefs.

## Installation

```bash
agent install gong
```

Or install from this repository via the Cursor marketplace / Customize → Plugins.

## Components

### MCP Servers

| Server | Description |
|:-------|:------------|
| `gong` | Official Gong MCP server (`https://mcp.gong.io/mcp`) |

## Authentication

Gong's MCP server uses static OAuth client credentials plus a user OAuth login.

1. A Gong technical administrator creates an MCP integration under **Company Settings → Ecosystem → API → Integrations** and enables the MCP scope.
2. Register these redirect URIs on the Gong integration:
   - Desktop: `http://localhost:8787/callback`
   - Web / Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
3. After installing the plugin, open **Dashboard → Plugins → Configure** and set **Gong Client ID** and **Gong Client Secret** from that integration.
4. Complete the Gong OAuth login when Cursor prompts you.

For team marketplaces, a team admin can set the client ID and secret once under **Plugins → Configure**; each member still completes Gong OAuth.

## License

MIT
