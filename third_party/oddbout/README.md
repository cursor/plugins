# ODDBOUT

Cursor plugin that connects agents to [ODDBOUT](https://oddbout.com), an AI-powered fighting game and character-creation platform, through ODDBOUT's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Explore fighters, rankings, cups, and bout records, read animation specifications, and create and register your own fighter.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **ODDBOUT**.
3. Click **Install**.

Or run `/add-plugin oddbout` in chat.

## MCP

```json
{
  "mcpServers": {
    "oddbout": {
      "type": "http",
      "url": "https://mcp.oddbout.com/mcp"
    }
  }
}
```

Public reads such as fighters, rankings, and the fighter spec work without signing in. Account features such as your profile and fighter creation and registration use Google sign-in through OAuth, and Cursor prompts for it when a tool needs it.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Fighters | Browse fighters, rankings, cups, and bout records |
| Specs | Read fighter and animation specifications |
| Creation | Find generation hosts and guide signed-in users through hosted fighter creation and registration |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ODDBOUT: https://oddbout.com
- Server URL: https://mcp.oddbout.com/mcp

Logo is ODDBOUT's site favicon (`https://oddbout.com/favicon.svg`), taken from the `favicon.svg` in ODDBOUT's public site source at `jeonghwanko/ai-fighter-dots-starter` (branch `codex/creator-pages`) because oddbout.com could not be reached when this plugin was added.

## License

MIT
