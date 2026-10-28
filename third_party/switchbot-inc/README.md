# SwitchBot AI MindClip

Cursor plugin that connects agents to [SwitchBot AI MindClip](https://www.switch-bot.com) through SwitchBot's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Review AI MindClip voice recordings, transcripts, summaries, to-dos, and recaps.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SwitchBot AI MindClip**.
3. Click **Install**, then complete the SwitchBot sign-in prompt.

Or run `/add-plugin switchbot-inc` in chat.

## MCP

```json
{
  "mcpServers": {
    "switchbot-inc": {
      "type": "http",
      "url": "https://mindclip-mcp.switchbot.net/mcp"
    }
  }
}
```

Auth is OAuth 2.1 authorization code with PKCE (S256), scope `mcp:mindclip:read`. Cursor prompts for SwitchBot sign-in when the plugin connects — there is no API key to configure.

## Before you connect

You need a SwitchBot account with AI MindClip recordings. MCP read access does not require a paid subscription.

## What agents can do

The server exposes eight read-only tools.

| Category | Capabilities |
| --- | --- |
| Recordings | List recordings and read their metadata |
| Transcripts | Find details in recording transcripts |
| Summaries | Read AI summaries of recordings |
| To-dos | Read extracted to-dos and urgent to-dos |
| Recaps | Read daily and weekly recaps |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The connector is read-only. Tool calls run under the MindClip account of the user who authorizes the connection.

## Docs

- SwitchBot: https://www.switch-bot.com
- MCP guide: https://www.switch-bot.com/pages/ai-mindclip-mcp-guide
- Server URL: https://mindclip-mcp.switchbot.net/mcp

Logo is the SwitchBot wordmark avatar of the official `OpenWonderLabs` GitHub organization (240×240). The submitted MindClip logo URL and switch-bot.com could not be reached when this plugin was added, so the file was not downloaded from them.

## License

MIT
