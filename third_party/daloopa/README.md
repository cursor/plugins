# Daloopa

Cursor plugin that connects agents to [Daloopa](https://docs.daloopa.com/docs/daloopa-mcp) through Daloopa's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Pull source-linked fundamentals, KPIs, filings, and prices.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Daloopa**.
3. Click **Install**, then complete the Daloopa sign-in prompt.

Or run `/add-plugin daloopa` in chat.

## MCP

```json
{
  "mcpServers": {
    "daloopa": {
      "type": "http",
      "url": "https://mcp.daloopa.com/server/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Daloopa sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Daloopa account and subscription. Coverage is 6,000+ global tickers, and every data point links back to the source filing, presentation, or transcript.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Companies | Find companies by ticker or name and discover their available series |
| Fundamentals | Quarterly and annual values for statements, segments, and KPIs, with source links |
| Documents | List, search, and read filings, transcripts, and presentations |
| Prices | Daily OHLCV history |
| Skills | Run Daloopa's pre-built analyses such as earnings reviews and comps |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Daloopa entitlements of the user who authorizes the connection.
- A separate docs server at `https://docs.daloopa.com/mcp` searches Daloopa's documentation and is not what this plugin connects to.

## Docs

- Daloopa MCP: https://docs.daloopa.com/docs/daloopa-mcp
- Client integrations: https://docs.daloopa.com/docs/mcp-integrations
- Server URL: https://mcp.daloopa.com/server/mcp

Logo is Daloopa's official mark, from the `daloopa` GitHub organization.

## License

MIT
