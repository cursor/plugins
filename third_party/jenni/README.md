# JENNi Instant Commerce

Cursor and Grok Bot plugin that connects agents to [JENNi Instant Commerce](https://shop.jennipro.com) through JENNi's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server (`https://shop.jennipro.com/mcp`).

Search JENNi's catalog, inspect ZIP-specific buying options, and begin a checkout hosted by JENNi for the shopper to review and approve. Checkout is completed by the shopper on JENNi; no order is placed through MCP.

## Install

1. Open **Cursor Settings → Plugins** (or Grok Bot plugins).
2. Search for **JENNi Instant Commerce**.
3. Click **Install** (no API key required).

Or run `/add-plugin jenni` in chat.

## MCP

```json
{
  "mcpServers": {
    "jenni": {
      "type": "http",
      "url": "https://shop.jennipro.com/mcp"
    }
  }
}
```

## What agents can do

| Tool | Purpose |
| --- | --- |
| `search_catalog` | Search the catalog, with an optional ZIP filter |
| `find_stores` | Find stores available for a ZIP area |
| `get_product` | Retrieve details for a product |
| `get_buying_options` | Inspect buying options for a product and ZIP, including the available fulfillment options |
| `start_checkout` | Begin checkout hosted by JENNi so the shopper can review and approve; the MCP call does not complete checkout or place an order |

## Docs

- Storefront: https://shop.jennipro.com
- WebMCP Discovery: https://shop.jennipro.com/.well-known/mcp.json
- OpenAPI 3.1 Spec: https://shop.jennipro.com/openapi.json
- Server URL: https://shop.jennipro.com/mcp

## License

MIT
