# BuyBox

Cursor plugin that connects agents to [BuyBox](https://buybox.agentconsult.ai) through Agentic Consulting's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Save your buying criteria for homes, cars, or anything else, so your agent checks your budget, must-haves, and dealbreakers before it searches or ranks listings.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **BuyBox**.
3. Click **Install**, then complete the Google sign-in prompt.

Or run `/add-plugin agentconsult` in chat.

## MCP

```json
{
  "mcpServers": {
    "agentconsult": {
      "type": "http",
      "url": "https://buybox.agentconsult.ai/mcp"
    }
  }
}
```

Auth is OAuth. Sign-in uses a Google account (via Clerk) with dynamic client registration, so Cursor prompts for sign-in when the plugin connects — there is no client ID or API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Buy boxes | Get, set, and delete a saved buy box per category; list your categories |
| Listings | Score and rank up to 100 listings against a buy box, flagging the rule each listing broke |
| Export | Export a saved buy box |

Buy boxes are private to your account. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- BuyBox: https://buybox.agentconsult.ai
- Support: https://buybox.agentconsult.ai/support
- Server URL: https://buybox.agentconsult.ai/mcp

The logo points at `https://buybox.agentconsult.ai/icon.png`. buybox.agentconsult.ai was unreachable when this plugin was added, so no logo file was committed.

## License

MIT
