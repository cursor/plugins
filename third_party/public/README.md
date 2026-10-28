# Public

Cursor plugin that connects agents to [Public](https://public.com) through Public's hosted, read-only [Model Context Protocol](https://modelcontextprotocol.io/) server.

View information about your Public brokerage accounts, check market data for equities, bonds, options, and prediction markets, and preview potential trades with preflight checks before deciding whether to trade.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Public**.
3. Click **Install**, then complete the Public sign-in prompt.

Or run `/add-plugin public` in chat.

## MCP

```json
{
  "mcpServers": {
    "public": {
      "type": "http",
      "url": "https://mcp.public.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Public sign-in when the plugin connects; there is no API key to configure.

## Before you connect

You need a Public account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | View information about your Public brokerage accounts |
| Market data | Check quotes and data for equities, bonds, options, and prediction markets |
| Trade preview | Run preflight checks on potential trades |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The endpoint is read-only: preflight checks preview a trade but do not place it.
- Tool calls run under the Public account of the user who authorizes the connection.

## Docs

- Public: https://public.com
- Public API docs: https://public.com/api/docs
- Server URL: https://mcp.public.com/mcp

Logo is Public's mark from the `PublicDotCom` GitHub organization avatar. public.com was unreachable from the build sandbox when this plugin was added, so the submitted logo (https://public.com/wp-content/uploads/2026/06/public-com-logo.svg) was not downloaded.

## License

MIT
