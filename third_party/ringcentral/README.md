# RingCentral

Cursor plugin that connects agents to [RingCentral](https://www.ringcentral.com) through RingCentral's hosted RingEX Phone [Model Context Protocol](https://modelcontextprotocol.io/) server.

RingEX Phone MCP server for calling, SMS, and voicemail.

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
      "url": "https://developers.ringcentral.com/mcp/servers/ringex-phone"
    }
  }
}
```

## Before you connect

You need a RingCentral account with RingEX Phone access.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Calling | Place and manage phone calls |
| SMS | Send and read text messages |
| Voicemail | Review voicemail |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the RingCentral permissions of the user who authorizes the connection.

## Docs

- RingCentral: https://www.ringcentral.com
- Server URL: https://developers.ringcentral.com/mcp/servers/ringex-phone

Logo is RingCentral's mark from the `ringcentral` GitHub organization avatar (256×256). ringcentral.com and developers.ringcentral.com failed the TLS handshake from the build environment when this plugin was added, so the submitted favicon (https://www.ringcentral.com/favicon.ico) was not downloaded.

## License

MIT
