# Redo

Plugin that connects agents to [Redo](https://redo.com/) through Redo's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Redo is a commerce platform for returns, order management, and post-purchase. The Redo MCP server connects AI assistants to a merchant's Redo account so they can manage returns, look up order details, update return statuses, process returned items, and ask Redo's AI questions about their store's data, all from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Redo**.
3. Click **Install**, then complete the Redo sign-in prompt.

Or run `/add-plugin redo` in chat. In Grok Bot (0.49 or newer), connect **Redo** from the connector list.

## MCP

```json
{
  "mcpServers": {
    "redo": {
      "type": "http",
      "url": "https://mcp.getredo.com/mcp",
      "placement": "server"
    }
  }
}
```

`"placement": "server"` tells Grok Bot (desktop and mobile) to dial Redo through the hosted MCP path, so it shows a connect / sign-in card. Cursor ignores it.

Auth is OAuth 2.1 with PKCE and dynamic client registration. An unauthenticated request returns `401` with `resource_metadata` pointing at `https://mcp.getredo.com/.well-known/oauth-protected-resource/mcp`, and the authorization server is `https://mcp.getredo.com/`. The client prompts for Redo sign-in when the plugin connects — there is no client ID or API key to configure.

## Before you connect

You need a Redo merchant account. You approve the access requested on Redo's sign-in and consent screens.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Returns | List and look up returns, update return statuses, process returned items, and read return tags |
| Orders | Look up order details |
| Store insights | Ask Redo's AI questions about your store's data |

Some of these tools change data in your Redo account (return statuses and processing), so review what the agent proposes before approving it. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Redo: https://redo.com/
- Server URL: https://mcp.getredo.com/mcp

Logo is Redo's official mark.

## License

MIT
