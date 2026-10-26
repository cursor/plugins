# Whisper Memos

Cursor plugin that connects agents to [Whisper Memos](https://whispermemos.com) through Whisper Memos' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Whisper Memos turns the voice memos you record on your iPhone or Apple Watch into text. This plugin lets your agent list, read, summarize, and delete those memos.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Whisper Memos**.
3. Click **Install**. When asked to sign in, a Whisper Memos page opens in your browser.
4. Approve the connection in the Whisper Memos app on your iPhone.

Or run `/add-plugin whisper-memos` in chat.

## MCP

```json
{
  "mcpServers": {
    "whisper-memos": {
      "type": "http",
      "url": "https://whispermemos.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Whisper Memos sign-in when the plugin connects. There is no API key to configure.

## Before you connect

You need an existing Whisper Memos account. The plugin only accesses memos in the account you connect.

## What agents can do

- List your recent memos, filtered by label or date
- Read a memo's transcript and summaries
- Delete a memo you no longer need

It cannot record, create, or edit memos. The hosted runtime is the source of truth for tool names and schemas.

## Example prompts

- "Summarize the memos I recorded this week."
- "Find my memo about the launch and list the action items."
- "Turn my latest memo into a GitHub issue."

## Docs

- Whisper Memos: https://whispermemos.com
- Server URL: https://whispermemos.com/mcp
- Plugin source: https://github.com/whispermemos/whisper-memos-plugin
- [Support](https://whispermemos.com/page/support)
- [Privacy policy](https://whispermemos.com/page/privacy-policy)

Logo is copied from `assets/logo.png` in the publisher's plugin repository.

## License

MIT
