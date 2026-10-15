# Greenhouse

Cursor plugin that connects agents to [Greenhouse](https://www.greenhouse.com) Recruiting through Greenhouse's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search candidates, jobs, and applications, review scorecards and interview stages, and, where your admin allows it, take recruiting actions in the signed-in Greenhouse organization.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Greenhouse**.
3. Click **Install**, then complete the Greenhouse sign-in prompt.

Or run `/add-plugin greenhouse` in chat.

## MCP

```json
{
  "mcpServers": {
    "greenhouse": {
      "type": "http",
      "url": "https://mcp.us.greenhouse.io/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Greenhouse with PKCE and dynamic client registration. Cursor prompts for Greenhouse sign-in when the plugin connects — there is no API key to configure. The server requests the `greenhouse:mcp_client` scope.

## Before you connect

A Greenhouse **Site Admin** must enable MCP scopes under **Configure → Dev Center → MCP Access** and save. Until scopes are saved, every sign-in ends on Greenhouse's "Unable to authorize" page. Greenhouse MCP is available on Greenhouse Recruiting Core, Plus, and Pro.

If sign-in still ends on "Unable to authorize", ask the Site Admin to add Cursor's redirect URLs in the **Clients** tab of MCP Access:

- `https://www.cursor.com/agents/mcp/oauth/callback` (Grok Bot)
- `http://localhost:8787/callback` (Grok Bot local fallback)
- `cursor://anysphere.cursor-mcp/oauth/callback` (Cursor IDE)

## Notes

- Tool calls run as the Greenhouse user who authorizes the connection, limited by both the organization's enabled MCP scopes and that user's Greenhouse permissions. Unconfigured organizations get read-only scopes.
- Greenhouse blocks delete endpoints and asks for confirmation before high-impact writes such as rejecting or hiring.
- Greenhouse MCP is in beta; tool inputs and outputs may change without notice.

## Docs

- Greenhouse MCP overview: https://support.greenhouse.io/hc/en-us/articles/52090956642075-Greenhouse-MCP
- Set up Greenhouse MCP with supported AI tools: https://support.greenhouse.io/hc/en-us/articles/52096319906971-Set-up-Greenhouse-MCP-with-supported-AI-tools
- Server URL: https://mcp.us.greenhouse.io/mcp

Logo is Greenhouse's official app icon (white "g" on the brand green tile) from https://www.greenhouse.com.

## License

MIT
