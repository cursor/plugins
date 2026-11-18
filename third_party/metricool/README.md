# Metricool

Cursor plugin that connects agents to [Metricool](https://metricool.com) through Metricool's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Plan and publish social posts, pull metrics and reports, and manage inbox messages, reviews, Smartlinks, and ad campaigns across your Metricool brands from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Metricool**.
3. Click **Install**, then complete the Metricool sign-in prompt.

Or run `/add-plugin metricool` in chat.

In Grok Bot, open **Settings → Plugins**, install **Metricool**, and complete the same Metricool sign-in.

## MCP

```json
{
  "mcpServers": {
    "metricool": {
      "type": "http",
      "url": "https://ai.metricool.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth. Metricool uses the authorization code flow with PKCE (S256) and dynamic client registration, with the scopes `mcp:read` and `mcp:write`, so there is no API key or client ID to configure. Cursor or Grok Bot prompts for Metricool sign-in when the plugin connects. Each user signs in with their own Metricool account.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## Before you connect

You need a Metricool account. MCP works on every plan, including Free, but your plan's limits still apply to what the agent can do. See [Metricool pricing](https://metricool.com/pricing/).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Brands | See and manage your brands and their connected networks |
| Analytics | Read and download metrics and reports |
| Publishing | See, create, and publish posts on any connected network, and manage autolists |
| Engagement | Read and manage inbox messages, post comments, and Google Business Profile reviews |
| Smartlinks | See and manage Smartlinks |
| Ads | See and manage ad campaigns on the ad accounts connected to your brands |
| Assets | Browse folders and files in connected Canva or Google Drive accounts |

The hosted runtime is the source of truth for tool names and schemas. See the [Metricool MCP docs](https://help.metricool.com/en/article/how-to-connect-metricools-mcp-1364s63/) for details.

## Notes

- The connection grants access similar to signing in to Metricool directly. Many tools publish or change things in public: posts, replies to comments and messages, review responses, and ad campaigns. Confirm the brand, network, and content before letting the agent publish or edit.
- Metricool also supports header-token auth (`X-Mc-Auth` with a Metricool API key) for clients like n8n. This plugin packages only the OAuth endpoint and does not send that header.
- Revoke access by disconnecting the plugin or from your Metricool account.

## Docs

- Metricool MCP server: https://help.metricool.com/en/article/how-to-connect-metricools-mcp-1364s63/
- Server URL: https://ai.metricool.com/mcp

Logo is Metricool's official mark, from the web app icon published on metricool.com.

## License

MIT
