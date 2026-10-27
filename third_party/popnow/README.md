# PopNow

Cursor plugin that connects agents to [PopNow](https://popnow.ai) through PopNow's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create and edit images, generate short videos, music, and voiceovers, improve media, and discover creative style presets.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **PopNow**.
3. Click **Install**, then complete the PopNow sign-in prompt.

Or run `/add-plugin popnow` in chat.

## MCP

```json
{
  "mcpServers": {
    "popnow": {
      "type": "http",
      "url": "https://api.popnow.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE (S256), using Client ID Metadata Documents or dynamic client registration. Cursor prompts for PopNow sign-in when the plugin connects; there is no API key to configure. The requested scopes are `generate` and `read`.

## Before you connect

You need a PopNow account. Connecting and discovering skills is free; media generation spends prepaid PopNow credits.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Images | Create and edit images |
| Video | Generate short videos |
| Audio | Generate music and voiceovers |
| Media | Improve existing media |
| Styles | Discover creative style presets |
| Account | Check credit balance, list models, and poll jobs |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Generation tools return a price before running; confirm larger jobs before they spend credits.
- Long-running generations return a `job_id`; poll it with `get_job`.

## Docs

- PopNow: https://popnow.ai
- MCP docs: https://popnow.ai/docs/mcp
- Setup repository: https://github.com/popnow-ai/popnow-mcp
- Server URL: https://api.popnow.ai/mcp

Logo is the `popnow-ai` GitHub organization avatar.

## License

MIT
