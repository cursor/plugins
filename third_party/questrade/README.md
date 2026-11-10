# Questrade

Plugin that connects agents to [Questrade](https://www.questrade.com/) through Questrade's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your Questrade portfolio, get live market data, and discuss potential trades.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Questrade**.
3. Click **Install**, then complete the Questrade sign-in prompt.

Or run `/add-plugin questrade` in chat. In Grok Bot (0.49 or newer), connect **Questrade** from the connector list.

## MCP

```json
{
  "mcpServers": {
    "questrade": {
      "type": "http",
      "url": "https://mcp.questrade.com/v1/brokerage/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. An unauthenticated request returns `401` with `resource_metadata` pointing at `https://mcp.questrade.com/.well-known/oauth-protected-resource`, and the authorization server is `https://login.questrade.com`. The client prompts for Questrade sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Questrade account. You approve the access requested on Questrade's sign-in and consent screens.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Portfolio | Accounts, balances, and positions |
| Market data | Live quotes and charts |
| Trading | Discuss potential trades |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Questrade: https://www.questrade.com/
- Server URL: https://mcp.questrade.com/v1/brokerage/mcp

Logo is Questrade's official mark.

## License

MIT
