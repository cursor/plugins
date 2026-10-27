# Twelve Data

Cursor plugin that connects agents to [Twelve Data](https://twelvedata.com) through Twelve Data's hosted remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Real-time and historical market data from Twelve Data: stocks, forex, crypto, ETFs and mutual funds. Quotes and price history, 60+ technical indicators, fundamentals, earnings, dividends, market movers and symbol search.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Twelve Data**.
3. Click **Install**, then complete the Twelve Data sign-in prompt.

Or run `/add-plugin twelvedata` in chat.

## MCP

```json
{
  "mcpServers": {
    "twelvedata": {
      "type": "http",
      "url": "https://mcp.twelvedata.com/mcp"
    }
  }
}
```

Transport is Streamable HTTP and auth is OAuth. Cursor prompts for Twelve Data sign-in when the plugin connects.

## Example prompts

- "Use Twelve Data to get the latest quote for AAPL."
- "Use Twelve Data to show RSI(14) for TSLA on the daily interval."
- "Use Twelve Data to get the EUR/USD rate."
- "Use Twelve Data to show the latest earnings for MSFT."
- "Use Twelve Data to find the symbol for Nvidia."

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Twelve Data: https://twelvedata.com
- Server URL: https://mcp.twelvedata.com/mcp

Logo is Twelve Data's official mark, from the `twelvedata` GitHub organization.

## License

MIT
