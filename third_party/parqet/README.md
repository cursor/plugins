# Parqet

Cursor plugin that connects agents to [Parqet](https://parqet.com) through Parqet's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Chat about your Parqet portfolios, holdings, transactions, and investment strategy.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Parqet**.
3. Click **Install**, then sign in to Parqet and choose which portfolios to share.

Or run `/add-plugin parqet` in chat.

## MCP

```json
{
  "mcpServers": {
    "parqet": {
      "type": "http",
      "url": "https://mcp.parqet.com"
    }
  }
}
```

Cursor prompts for Parqet sign-in when the plugin connects. During sign-in you pick the portfolios the agent can see and whether it gets read or write access.

## Before you connect

You need a Parqet account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Portfolios | List portfolios and report their value and performance |
| Holdings | Review holdings and, with write access, create them (including savings plans) |
| Transactions | Look up transactions and, with write access, add them |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Parqet account and portfolio permissions granted during sign-in.

## Docs

- Parqet: https://parqet.com
- Server URL: https://mcp.parqet.com

Logo is Parqet's mark from the `tresorone` GitHub organization (Parqet's former name, with parqet.com as its website). parqet.com blocked automated requests when this plugin was added, so the file was not downloaded from the website.

## License

MIT
