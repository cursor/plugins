# RingCentral

Cursor plugin that connects agents to [RingCentral](https://www.ringcentral.com) RingEX Phone through RingCentral's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

RingEX Phone remote MCP server.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **RingCentral**.
3. Click **Install**, then complete the RingCentral sign-in prompt if one appears.

Or run `/add-plugin ringcentral` in chat.

## MCP

```json
{
  "mcpServers": {
    "ringcentral": {
      "type": "http",
      "url": "https://mcp.labs.ringcentral.com/ringex/phone"
    }
  }
}
```

## Before you connect

You need a RingCentral account with RingEX phone service.

## Notes

- The hosted runtime is the source of truth for tool names and schemas.
- Tool calls run under the RingCentral permissions of the user who authorizes the connection.

## Docs

- RingCentral: https://www.ringcentral.com
- RingEX Phone MCP server: https://developers.ringcentral.com/mcp/servers/ringex-phone/
- Server URL: https://mcp.labs.ringcentral.com/ringex/phone

Logo is RingCentral's mark from the `ringcentral` GitHub organization avatar (256×256). The submitted logo URL (`https://developers.ringcentral.com/mcp/servers/ringex-phone/`) is a web page, and ringcentral.com could not be reached when this plugin was added.

## License

MIT
