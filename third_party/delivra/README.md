# Delivra

Cursor plugin that connects agents to [Delivra](https://delivra.com) through Delivra's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Explore email and SMS campaign performance, subscriber activity, engagement metrics, top domains, and poll results.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Delivra**.
3. Click **Install**, then complete the Delivra sign-in prompt.

Or run `/add-plugin delivra` in chat.

## MCP

```json
{
  "mcpServers": {
    "delivra": {
      "type": "http",
      "url": "https://integration.delivra.com/mcp"
    }
  }
}
```

## Before you connect

You need a Delivra account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Campaigns | Review email and SMS campaign performance |
| Subscribers | Look up subscriber activity and engagement metrics |
| Reporting | See top domains and poll results |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Delivra: https://delivra.com
- Server URL: https://integration.delivra.com/mcp

Logo is the SVG mark supplied with the Delivra submission.

## License

MIT
