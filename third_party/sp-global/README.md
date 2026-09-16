# S&P Global

Cursor plugin that connects agents to [S&P Global](https://docs.kensho.com/llmreadyapi/overview) through S&P Global's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query S&P Capital IQ financials, prices, and transcripts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **S&P Global**.
3. Click **Install**, then complete the S&P Global sign-in prompt.

Or run `/add-plugin sp-global` in chat.

## MCP

```json
{
  "mcpServers": {
    "sp-global": {
      "type": "http",
      "url": "https://kfinance.kensho.com/integrations/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for S&P Global sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need an active S&P Global Market Intelligence subscription or trial for the Kensho LLM-ready API.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Companies | Resolve companies by ticker, ISIN, or CUSIP and read profiles |
| Financials | Statements and 200+ line items from S&P Capital IQ |
| Prices | Historical prices, volumes, market cap, and enterprise value |
| Research | Earnings call transcripts, business relationships, M&A, and estimates |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the S&P Global entitlements of the user who authorizes the connection.
- Kensho also ships the open-source `kensho-kfinance` package for a local server; this plugin uses the hosted server only.

## Docs

- Kensho LLM-ready API: https://docs.kensho.com/llmreadyapi/overview
- kfinance on GitHub: https://github.com/kensho-technologies/kfinance
- Server URL: https://kfinance.kensho.com/integrations/mcp

Logo is S&P Global's official mark (black rule over red block), redrawn at 192×192 from the icon published on marketplace.spglobal.com.

## License

MIT
