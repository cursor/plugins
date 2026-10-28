# MSG91

Cursor plugin that connects agents to [MSG91](https://msg91.com/) through MSG91's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

MSG91 MCP helps businesses engage customers, automate communication, and reach users with personalized multi-channel messaging across SMS, WhatsApp, email, voice and OTP.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **MSG91**.
3. Click **Install**.

Or run `/add-plugin msg91` in chat.

## MCP

```json
{
  "mcpServers": {
    "msg91": {
      "type": "http",
      "url": "https://mcp.msg91.com/mcp"
    }
  }
}
```

The publisher states that no authentication or MSG91 account is needed to connect.

## Try it

- "What modules does MSG91 offer?"
- "Show me the request format for the Send SMS endpoint."
- "How do I send a WhatsApp template message?"

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- MSG91: https://msg91.com/
- Server URL: https://mcp.msg91.com/mcp

Logo is the MSG91 mark from the `MSG91` GitHub organization avatar. The submitted logo URL could not be downloaded when this plugin was added.

## License

MIT
