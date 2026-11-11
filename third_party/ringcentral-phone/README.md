# RingCentral Phone

Cursor plugin that connects agents to [RingCentral Phone](https://www.ringcentral.com) through RingCentral's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read call activity, AI call notes, SMS, voicemail, and fax, and send SMS.

This is a separate plugin from [RingCentral Chat](../ringcentral-chat/). Each one connects to its own RingCentral server.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **RingCentral Phone**.
3. Click **Install**, then complete the RingCentral sign-in prompt if one appears.

Or run `/add-plugin ringcentral-phone` in chat.

## MCP

```json
{
  "mcpServers": {
    "ringcentral-phone": {
      "type": "http",
      "url": "https://mcp.labs.ringcentral.com/ringex/phone"
    }
  }
}
```

## Before you connect

You need a RingCentral account with phone service.

## Notes

- The hosted runtime is the source of truth for tool names and schemas.
- Tool calls run under the RingCentral permissions of the user who authorizes the connection.

## Docs

- RingCentral: https://www.ringcentral.com
- RingCentral Phone MCP server: https://developers.ringcentral.com/mcp/servers/ringex-phone/
- Server URL: https://mcp.labs.ringcentral.com/ringex/phone

Logo is RingCentral's mark from the `ringcentral` GitHub organization avatar (256×256). The submitted logo URL (`https://developers.ringcentral.com/mcp/servers/ringex-phone/`) is a web page, and ringcentral.com could not be reached when this plugin was added.

## License

MIT
