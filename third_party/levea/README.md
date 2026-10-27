# Levea

Cursor plugin that connects agents to [Levea](https://www.livecore.ai) through Levea's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Edit videos from plain-language prompts: clips, captions, reframing, voiceover, and export.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Levea**.
3. Click **Install**, then complete the Levea sign-in prompt.

Or run `/add-plugin levea` in chat.

## MCP

```json
{
  "mcpServers": {
    "levea": {
      "type": "http",
      "url": "https://api.livecore.ai/api/v1/misc/mcp"
    }
  }
}
```

Auth is OAuth 2.1. Cursor opens a Levea sign-in page at livecore.ai when the plugin connects; there is no API key to configure.

## Before you connect

You need a Levea account. New accounts are created on first sign-in.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Editing | Describe an edit in plain language and get a finished MP4 |
| Clips | Cut short clips from long videos and reframe to 9:16 with face tracking |
| Captions | Add word-by-word animated captions from caption templates |
| Effects | Chroma key, background removal, B-roll, and silence removal |
| Audio | AI voiceover and music |
| Export | Export for multiple platforms |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Levea: https://www.livecore.ai
- Source and docs: https://github.com/brajendrak00068/agentic-ai-video-production
- Server URL: https://api.livecore.ai/api/v1/misc/mcp

## License

MIT
