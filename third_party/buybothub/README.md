# BuyBotHub Bot Finder

Cursor plugin that connects agents to [BuyBotHub](https://www.buybothub.com)'s hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask for a Grok Bot in plain words, like "find me a bot that replies to my Google reviews". The server searches BuyBotHub's directory of 5,600+ Grok Bots shared by their makers and returns the best matches, each with what it does, who made it, a link that opens it in Grok, and its page on BuyBotHub.

BuyBotHub is independent and is not affiliated with or endorsed by xAI.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **BuyBotHub Bot Finder**.
3. Click **Install**.

Or run `/add-plugin buybothub` in chat.

## MCP

```json
{
  "mcpServers": {
    "buybothub": {
      "type": "http",
      "url": "https://www.buybothub.com/mcp?plain=1"
    }
  }
}
```

The server is public and read-only. There is no sign-in, API key, or client ID to configure, and nothing is stored.

## What agents can do

| Tool | Capability |
| --- | --- |
| `find_bots` | Search the directory for bots matching a plain-language request |
| `popular_bots` | List popular bots |
| `bot_details` | Get the details of one bot |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- BuyBotHub: https://www.buybothub.com
- Server URL: https://www.buybothub.com/mcp?plain=1

## License

MIT
