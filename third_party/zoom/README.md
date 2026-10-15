# Zoom

Cursor plugin that connects agents to [Zoom](https://zoom.us) through Zoom's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) servers.

Search meetings and recordings, pull summaries and transcripts, and work with Zoom Docs from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Zoom**.
3. Click **Install**, then set the client ID (below) and complete the Zoom sign-in prompt.

Or run `/add-plugin zoom` in chat.

## MCP

```json
{
  "mcpServers": {
    "zoom": {
      "type": "http",
      "url": "https://mcp.zoom.us/mcp/zoom/streamable",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET:-}"
      }
    }
  }
}
```

## Setup

Zoom's MCP servers only support manual client registration — Dynamic Client Registration and Client ID Metadata Documents are not accepted — so an administrator has to register Cursor as a Zoom app before anyone can connect.

1. A Zoom admin or developer logs into the [Zoom App Marketplace](https://marketplace.zoom.us) and creates a **General app** under **Develop → Build app**.
2. Add the scopes listed for each tool in [Zoom's MCP server docs](https://developers.zoom.us/docs/mcp/servers/). Meeting search and recordings need `ai_companion:read:search` for cross-Zoom search.
3. Under **Basic Information → OAuth Information**, register both redirect URIs:
   - Desktop: `http://127.0.0.1:8787/callback`
   - Web and Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
4. Under **Basic Information → App Credentials**, turn on **Use Public Client OAuth** and copy the **Public Client ID**.
5. In **Dashboard → Plugins → Configure**, set **Zoom Client ID** to that Public Client ID and leave **Zoom Client Secret** blank.
6. Complete the Zoom OAuth login when Cursor prompts.

Zoom only accepts a loopback redirect such as `http://127.0.0.1:8787/callback` for a public client, and rejects `localhost` outright. A public client proves each sign-in with PKCE instead of a shared secret, so there is no secret to store or leak. The confidential Client ID and Client Secret pair still works for Web and Cloud Agents, but Zoom refuses its desktop loopback redirect.

Each member needs a license for the Zoom products they want to reach. On a team marketplace an admin sets the client ID once for everyone; each member still completes their own Zoom OAuth login, so tool calls run with that member's Zoom permissions.

## Other Zoom MCP servers

Zoom splits tools across product-specific servers. This plugin ships the main `zoom` server, which covers meeting search, cross-Zoom search, recordings, summaries, meeting assets, and the main-server Zoom Docs tools. To reach the others, add them to `mcp.json` with the same `auth` block:

| Server | URL |
| --- | --- |
| Zoom Docs | `https://mcp.zoom.us/mcp/docs/streamable` |
| Whiteboard | `https://mcp.zoom.us/mcp/whiteboard/streamable` |
| Team Chat | `https://mcp.zoom.us/mcp/team_chat/streamable` |

Zoom also exposes SSE variants at the same paths with `/sse` instead of `/streamable`.

## Docs

- Zoom MCP overview: https://developers.zoom.us/docs/mcp/servers/
- Connecting MCP clients: https://developers.zoom.us/docs/mcp/servers/connect-to-zoom-mcp-servers/

## License

MIT
