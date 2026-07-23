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

Gong's MCP server uses OAuth. A Gong technical administrator must create an MCP integration under **Company Settings → Ecosystem → API → Integrations** and enable the MCP scope.

When connecting from Cursor, register these redirect URIs on the Gong integration if prompted:

- Desktop: `http://localhost:8787/callback`
- Web / Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`

If Gong requires static OAuth client credentials, configure them in your MCP settings (or environment) after install — for example `GONG_MCP_CLIENT_ID` and `GONG_MCP_CLIENT_SECRET`.

## License

MIT
