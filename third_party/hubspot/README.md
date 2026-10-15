# HubSpot

Cursor plugin that connects agents to [HubSpot](https://www.hubspot.com) through HubSpot's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and update CRM records, work with activities and conversations, and manage marketing email drafts in the signed-in HubSpot account.

This is HubSpot's remote CRM MCP server — not the [developer MCP server](https://developers.hubspot.com/docs/developer-tooling/local-development/developer-mcp/setup), which helps build apps and CMS assets locally.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HubSpot**.
3. Click **Install** and complete the HubSpot sign-in prompt. Leave the client ID and secret blank to use Grok's HubSpot app where it is available; otherwise set them from your own app (below).

Or run `/add-plugin hubspot` in chat.

## MCP

```json
{
  "mcpServers": {
    "hubspot": {
      "type": "http",
      "url": "https://mcp.hubspot.com",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

## Setup

Cursor is rolling out Grok's HubSpot app. Where it is available, leave **HubSpot Client ID** and **HubSpot Client Secret** blank and skip the steps below. If Cursor reports that the plugin's OAuth client is not configured, set up your own app.

HubSpot's remote MCP server requires a dedicated MCP auth app with OAuth (PKCE). An administrator or developer has to create that app before anyone can connect.

1. In HubSpot, go to **Development → MCP Auth Apps** (or open [app.hubspot.com/l/mcp-auth-apps](https://app.hubspot.com/l/mcp-auth-apps/)) and click **Create MCP auth app**.
2. Register both redirect URLs on that app:
   - Desktop: `http://localhost:8787/callback`
   - Web and Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
3. In **Dashboard → Plugins → Configure**, set **HubSpot Client ID** and **HubSpot Client Secret** from that app.
4. Complete the HubSpot OAuth login when Cursor prompts. Select the account to connect and grant permissions.

On a team marketplace an admin sets the client ID and secret once for everyone; each member still completes their own HubSpot OAuth login, so tool calls run with that member's HubSpot permissions.

Scopes are not declared on the app up front — they come from the MCP server's available tools and the permissions the installing user grants. If HubSpot adds tools later, users may need to reinstall to pick up new scopes.

## Notes

- If the HubSpot account has Sensitive Data turned on, activity objects and conversation data are blocked through the MCP server (this does not affect the standard CRM APIs).
- Help desk conversations are visible to all users; conversations-inbox access follows the same team/user restrictions as in HubSpot.

## Docs

- Remote HubSpot MCP server: https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server
- Server URL: https://mcp.hubspot.com

Logo is HubSpot's official inverted favicon (white sprocket on the brand orange tile) from https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png.

## License

MIT
