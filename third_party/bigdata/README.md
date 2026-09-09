# Bigdata.com

Cursor plugin that connects agents to [Bigdata.com](https://docs.bigdata.com/mcp-reference/introduction) through Bigdata.com's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search financial news, filings, transcripts, and company data.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Bigdata.com**.
3. Click **Install**, then enter your Bigdata.com API key.

Or run `/add-plugin bigdata` in chat.

## MCP

```json
{
  "mcpServers": {
    "bigdata": {
      "type": "http",
      "url": "https://mcp.bigdata.com/",
      "headers": {
        "x-api-key": "${BIGDATA_API_KEY}"
      }
    }
  }
}
```

Auth is an API key sent as the `x-api-key` header. Cursor asks for `BIGDATA_API_KEY` when you install the plugin and never stores it in the repository.

## Before you connect

You need a Bigdata.com account and an API key from the Bigdata Developer Platform. Search and tearsheet calls draw on the quota attached to that key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Semantic and lexical search across news, filings, transcripts, and research |
| Securities | Find companies, ETFs, and funds by name, ticker, or identifier |
| Tearsheets | Company, country, market, ETF, sentiment, and portfolio snapshots |
| Calendar | Earnings and conference call schedule |
| Private content | List, fetch, and upload your own documents |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Bigdata.com documents OAuth only for its own first-party connectors; custom clients authenticate with `x-api-key`, so this plugin uses an API key variable.
- A separate docs server at `https://docs.bigdata.com/mcp` is for code assistants building integrations and is not what this plugin connects to.

## Docs

- MCP reference: https://docs.bigdata.com/mcp-reference/introduction
- Developer platform: https://developers.bigdata.com
- Server URL: https://mcp.bigdata.com/

Logo is Bigdata.com's official mark.

## License

MIT
