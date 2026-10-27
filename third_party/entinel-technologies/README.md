# Entergram

Cursor plugin that connects agents to [Entergram](https://entergram.com) through Entinel Technologies' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Connect your personal Telegram accounts through Entergram. Find customer conversations, summarize messages, send replies, and manage CRM notes, tickets, and follow-ups in one shared workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Entergram**.
3. Click **Install**, then complete the Entergram sign-in prompt.

Or run `/add-plugin entinel-technologies` in chat.

## MCP

```json
{
  "mcpServers": {
    "entinel-technologies": {
      "type": "http",
      "url": "https://mcp.entergram.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0. Cursor prompts for Entergram sign-in when the plugin connects, and you authorize the workspace you want agents to use.

## Before you connect

You need an Entergram account ([app.entergram.com](https://app.entergram.com)) with at least one Telegram account connected.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Telegram | List connected accounts, find conversations, summarize messages, send replies |
| CRM | Create and update notes, tickets, and follow-ups |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Sending a reply posts a real Telegram message from the connected account.
- CRM notes and comments stay in Entergram and do not send Telegram messages.

## Docs

- Entergram: https://entergram.com
- Server URL: https://mcp.entergram.com/mcp

The logo points at `https://www.entergram.com/logo.png`. entergram.com refused connections when this plugin was added, so no logo file was committed.

## License

MIT
