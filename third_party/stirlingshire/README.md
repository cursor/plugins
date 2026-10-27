# Stirling ONE

Cursor plugin that connects agents to [Stirling ONE](https://www.stirlingshire.com/one), Stirlingshire's wealth-management platform for advisors, through a hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Work with client households, portfolios, and meeting prep in Stirling ONE.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Stirling ONE**.
3. Click **Install**, then complete the Stirlingshire sign-in prompt.

Or run `/add-plugin stirlingshire` in chat.

## MCP

```json
{
  "mcpServers": {
    "stirlingshire": {
      "type": "http",
      "url": "https://app.stirlingshire.net/"
    }
  }
}
```

## Before you connect

You need a Stirling ONE advisor account. Sign-in uses your Stirling ONE email, password, and authenticator app.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Households | Look up client households and their context |
| Portfolios | Review client portfolios and holdings |
| Meetings | Prepare for client meetings |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Stirling ONE permissions of the advisor who signs in.

## Docs

- Stirling ONE: https://www.stirlingshire.com/one
- Server URL: https://app.stirlingshire.net/

Logo is the crest from the `Stirlingshire` GitHub organization avatar, at 256×256. The submitted logo URL (https://stirlingshire.com/stirlingshire-logo-plate.png) could not be reached when this plugin was added.

## License

MIT
