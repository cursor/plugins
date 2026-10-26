# Artlist

Cursor plugin that connects agents to [Artlist](https://artlist.io/) through Artlist's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create images, videos, music, and voice-overs with leading AI models on Artlist, right from your chat. Start with an idea or a reference image and turn it into ready-to-use creative, and find licensed music and sound effects in the Artlist catalog without leaving your conversation.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Artlist**.
3. Click **Install**, then complete the Artlist sign-in prompt.

Or run `/add-plugin artlist` in chat.

## MCP

```json
{
  "mcpServers": {
    "artlist": {
      "type": "http",
      "url": "https://mcp.artlist.io/mcp"
    }
  }
}
```

Cursor prompts for Artlist sign-in when the plugin connects.

## Before you connect

You need an Artlist account. AI generation uses Artlist AI credits; the assistant may show the credit cost and ask for approval before generating.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Images | Generate images from a prompt or a reference image |
| Video | Turn prompts or images into short videos |
| Audio | Generate music and voice-overs |
| Catalog | Find licensed music and sound effects in the Artlist catalog |
| Account | Check your Artlist AI credit balance |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Artlist: https://artlist.io/
- Server URL: https://mcp.artlist.io/mcp

Logo is the Artlist wordmark from the `Artlist-LTD` GitHub organization avatar, resized to 256×256. artlist.io could not be reached from the build environment when this plugin was added, so the submitted logo (https://artlist.io/apple-touch-icon.png) was not downloaded.

## License

MIT
