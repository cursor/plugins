# TTMI

Cursor plugin that connects agents to [TTMI](https://ttmi.ai) through TTMI's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

TTMI turns walls of text into a mental image: a step-by-step walkthrough with guided voice that you follow at your own pace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **TTMI**.
3. Click **Install**, then complete the TTMI sign-in prompt.

Or run `/add-plugin ttmi` in chat.

## MCP

```json
{
  "mcpServers": {
    "ttmi": {
      "type": "http",
      "url": "https://ttmi.ai/mcp"
    }
  }
}
```

Auth is OAuth. When the plugin connects, Cursor opens the TTMI sign-in page; sign in and approve access. There is no API key to configure.

## Before you connect

You need a TTMI account.

## Notes

- Tool calls run under the TTMI account and organization of the user who authorizes the connection.
- The hosted runtime is the source of truth for tool names and schemas.

## Docs

- TTMI: https://ttmi.ai
- Server URL: https://ttmi.ai/mcp

The logo points at `https://ttmi.ai/icon-512.png`, the icon URL from the submission. ttmi.ai could not be reached when this plugin was added, so no logo file is committed yet.

## License

MIT
