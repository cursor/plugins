# Sync

Cursor plugin that connects agents to [Sync](https://www.talktosync.com/) through Sync's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Sync is an AI matchmaker and relationship coach for adults seeking a serious relationship. Instead of swiping, you talk: Sync gets to know you through conversation, builds a compatibility profile, and introduces you to real, compatible people. Every match is a real person, never an AI.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Sync**.
3. Click **Install**, then complete the Sync sign-in prompt (Apple, Google, or email).

Or run `/add-plugin sync` in chat.

## MCP

```json
{
  "mcpServers": {
    "sync": {
      "type": "http",
      "url": "https://app.talktosync.com/mcp"
    }
  }
}
```

## What agents can do

| Category | Capabilities |
| --- | --- |
| Profile | Set up your Sync profile |
| Conversation | Talk with Sync so it can learn what you're looking for |
| Matches | Get a Daily Match Report of up to three real candidates, with the reasons for each |
| Responses | Say Curious or Not Curious to each match |

When two people are both Curious, the conversation moves to the Sync app.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Sync: https://www.talktosync.com/
- Server URL: https://app.talktosync.com/mcp

The logo points at Sync's hosted icon (`https://www.talktosync.com/icon.png`). The image could not be downloaded when this plugin was added, so no local copy is committed yet.

## License

MIT
