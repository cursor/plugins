# FLORA

Cursor plugin that connects agents to [FLORA](https://flora.ai) through FLORA's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

FLORA brings its AI creative canvas into your agent. Ask for images, video, or 3D in plain words and FLORA generates them with leading models, organizes results on a shareable canvas, and lets you iterate on any asset without leaving the chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FLORA**.
3. Click **Install**, then complete the FLORA sign-in prompt.

Or run `/add-plugin flora` in chat.

## MCP

```json
{
  "mcpServers": {
    "flora": {
      "type": "http",
      "url": "https://agents.flora.ai/mcp/cursor"
    }
  }
}
```

Auth is OAuth. Cursor prompts for FLORA sign-in when the plugin connects.

## Before you connect

You need a FLORA account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Images | Generate images from a plain-language prompt with leading models |
| Video | Turn prompts or existing images into short videos |
| 3D | Generate 3D assets |
| Canvas | Organize results on a shareable FLORA canvas and iterate on any asset |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- FLORA: https://flora.ai
- MCP docs: https://docs.flora.ai/mcp
- Server URL: https://agents.flora.ai/mcp/cursor

Logo is FLORA's icon from https://github.com/florafauna-ai/flora-mcp-skills, resized to 256×256.

## License

MIT
