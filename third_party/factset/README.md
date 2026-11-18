# FactSet

Cursor plugin that connects agents to [FactSet](https://www.factset.com) through FactSet's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server (AI-Ready Data).

Query company fundamentals, consensus estimates, global prices, ownership, people, events, M&A, supply chain, and related FactSet content in the signed-in account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FactSet**.
3. Click **Install**, then complete the FactSet sign-in prompt.

Or run `/add-plugin factset` in chat.

In Grok Bot, open **Settings → Plugins**, install **FactSet**, and complete the same FactSet sign-in.

## MCP

```json
{
  "mcpServers": {
    "factset": {
      "type": "http",
      "url": "https://mcp.factset.com/content/v1",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE (S256) and Dynamic Client Registration against `auth.factset.com`, with the `openid`, `mcp`, and `email` scopes. Cursor registers itself and prompts for FactSet sign-in when the plugin connects, so there is no API key or client ID to configure. Each user signs in with their own FactSet account.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## Before you connect

You need a FactSet account whose entitlements cover the datasets you want to query. Access follows the signed-in user's existing FactSet permissions. FactSet offers a trial from the [AI-Ready Data MCP page](https://developer.factset.com/mcp/factset-ai-ready-data-mcp).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Fundamentals | Company financial statements and ratios |
| Estimates | Sell-side consensus estimates, surprises, and ratings |
| Prices | Global end-of-day equity prices, returns, and related market data |
| Ownership | Fund holdings, institutional ownership, and insider activity |
| People & entities | Executive profiles and entity reference data |
| Events | Corporate calendar events such as earnings calls and conferences |
| M&A | Deal details, parties, and terms |
| Supply chain & revenue | Customer, supplier, and competitor links; geographic revenue exposure |
| Other content | Metrics, funds and ETFs, private companies, private equity and VC, debt structure, industry classification, and screening, as the signed-in account's entitlements allow |

The hosted runtime is the source of truth for tool names and schemas. See [FactSet AI-Ready Data MCP](https://developer.factset.com/mcp/factset-ai-ready-data-mcp) for the current catalogue.

## Notes

- Tool calls run under the FactSet entitlements of the user who authorizes the connection. Datasets the account is not entitled to are not returned.
- The server is read-only. Licensed FactSet content is bound by the account's subscription and supplier terms; do not redistribute it outside that agreement.
- Nothing the server returns is investment advice.
- Revoke access by disconnecting the plugin in Cursor.

## Docs

- FactSet AI-Ready Data MCP: https://developer.factset.com/mcp/factset-ai-ready-data-mcp
- FactSet MCP overview: https://developer.factset.com/mcp
- Marketplace product page: https://www.factset.com/marketplace/catalog/product/model-context-protocol
- Server URL: https://mcp.factset.com/content/v1

Logo is FactSet's official "F" mark, the App Store icon published for the FactSet iOS app.

## License

MIT
