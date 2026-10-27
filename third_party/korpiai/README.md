# KorpiAI

Cursor plugin that connects agents to [KorpiAI](https://korpi.ai) through KorpiAI's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Make faceless short-form videos and images from a prompt, then post finished videos to connected TikTok, YouTube, and Instagram accounts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **KorpiAI**.
3. Click **Install**, then complete the KorpiAI sign-in prompt.

Or run `/add-plugin korpiai` in chat.

## MCP

```json
{
  "mcpServers": {
    "korpiai": {
      "type": "http",
      "url": "https://backend.korpi.ai/mcp"
    }
  }
}
```

Auth is OAuth. When the plugin connects, Cursor opens KorpiAI's approval page (`korpi.ai/mcp/device`) so you can sign in. There is no API key to configure.

## Before you connect

You need a KorpiAI account. Generation uses KorpiAI credits from that account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Niche videos | List supported niches (AI fruit stories, stickman, What If You Became, and more) and generate a full video from a prompt |
| Media | Generate images, video clips, and voiceovers |
| Projects | Browse recent projects and poll a render until it returns a video URL |
| Automations | Manage KorpiAI automations |
| Account | Check credit balance |
| Publishing | Post finished videos to connected TikTok, YouTube, and Instagram accounts |

The hosted runtime is the source of truth for tool names and schemas.

## Example prompts

- "What niches can Korpi make?"
- "Check my Korpi credits"
- "Make a short AI fruit story video about a brave mango"
- "Show my recent Korpi projects"

## Notes

- Tool calls run under the KorpiAI account that authorizes the connection, and generation spends that account's credits.
- Posting to social accounts publishes publicly. Confirm before asking the agent to post.

## Docs

- KorpiAI: https://korpi.ai
- Server URL: https://backend.korpi.ai/mcp
- Support: contact@korpi.ai

Logo is the KorpiAI mark from the `KorpiAI` GitHub organization avatar (90×90). korpi.ai blocked automated requests when this plugin was added, so the submitted icon (`https://korpi.ai/apple-icon.png`) was not downloaded.

## License

MIT
