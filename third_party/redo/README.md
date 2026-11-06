# Redo

Cursor plugin that connects agents to [Redo](https://redo.com) through Redo's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Look up orders, create returns, and report on returns, email campaigns, and Commerce Agent conversations in your Redo account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Redo**.
3. Click **Install**, then complete the Redo sign-in prompt.

Or run `/add-plugin redo` in chat.

## MCP

```json
{
  "mcpServers": {
    "redo": {
      "type": "http",
      "url": "https://mcp.getredo.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. An unauthenticated request returns `401` with `resource_metadata` pointing at `https://mcp.getredo.com/.well-known/oauth-protected-resource/mcp`. The authorization server is `https://mcp.getredo.com/`, it supports dynamic client registration, and sign-in happens on `app.getredo.com`. There is no client ID or key to configure.

## Before you connect

You need a Redo merchant account. The agent acts with that account's permissions.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Orders | Find a customer's orders and summarize them |
| Returns | Create a return step by step; Redo confirms the refund details with you before submitting |
| Marketing | Email campaign revenue, opens, clicks, and ROI |
| Analytics | Custom reports, such as return rate by product, to view in Redo or download as CSV |
| Commerce Agent | Summaries of what shoppers asked Redo's Commerce Agent |
| Account | Questions about your Redo settings, answered by Redo's support AI |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Redo MCP: https://redo.com/ai/mcp
- Server URL: https://mcp.getredo.com/mcp

Logo is Redo's official mark, the 256×256 app icon from redo.com.

## License

MIT
