# Rinston

Cursor plugin that connects agents to [Rinston](https://rinston.com) through Rinston's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read the messages on your Rinston workspace phone number.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Rinston**.
3. Click **Install**, then complete the Rinston sign-in prompt.

Or run `/add-plugin rinston` in chat.

## MCP

```json
{
  "mcpServers": {
    "rinston": {
      "type": "http",
      "url": "https://rinston.com/api/agent/mcp"
    }
  }
}
```

The server supports OAuth 2.1 with PKCE. Rinston also issues agent keys from your rinston.com account, sent as `Authorization: Bearer <key>`.

## Before you connect

You need a Rinston account with a workspace phone number assigned to your agent.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Messages | Read messages on the workspace phone number assigned to the agent |

Sending SMS and placing live calls are not supported by this plugin. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Rinston: https://rinston.com
- Server URL: https://rinston.com/api/agent/mcp
- Source: https://github.com/lamxjason/rinston-plugin
- Privacy: https://rinston.com/privacy
- Terms: https://rinston.com/terms

## License

MIT
