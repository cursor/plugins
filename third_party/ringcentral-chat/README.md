# RingCentral Chat

Cursor plugin that connects agents to [RingCentral Chat](https://www.ringcentral.com) through RingCentral's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read team chats and posts, send messages, and manage teams, tasks, and notes.

This is a separate plugin from [RingCentral Phone](../ringcentral-phone/). Each one connects to its own RingCentral server.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **RingCentral Chat**.
3. Click **Install**, then complete the RingCentral sign-in prompt if one appears.

Or run `/add-plugin ringcentral-chat` in chat.

## MCP

```json
{
  "mcpServers": {
    "ringcentral-chat": {
      "type": "http",
      "url": "https://mcp.labs.ringcentral.com/ringex/v1.1.0/team-chat"
    }
  }
}
```

## Before you connect

You need a RingCentral account with team messaging.

## Notes

- The hosted runtime is the source of truth for tool names and schemas.
- Tool calls run under the RingCentral permissions of the user who authorizes the connection.

## Docs

- RingCentral: https://www.ringcentral.com
- RingCentral Chat MCP server: https://developers.ringcentral.com/mcp/servers/ringex-chat/
- Server URL: https://mcp.labs.ringcentral.com/ringex/v1.1.0/team-chat

Logo is RingCentral's mark from the `ringcentral` GitHub organization avatar (256×256). The submitted logo URL (`https://developers.ringcentral.com/mcp/servers/ringex-chat/`) is a web page, and ringcentral.com could not be reached when this plugin was added.

## License

MIT
