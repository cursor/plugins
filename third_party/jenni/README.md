# JENNi Instant Commerce

Cursor and Grok Bot plugin that connects agents to [JENNi Instant Commerce](https://shop.jennipro.com) through JENNi's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server (`https://shop.jennipro.com/mcp`).

Search 58,900+ GTIN-verified physical products across 33,000+ local brick-and-mortar US retail stores, verify real-time ZIP-level availability and local shelf prices, and create instant Stripe checkout links for 1-hour courier delivery.

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
| `search_catalog` | Search GTIN-verified products across local US retail stores with optional `zip` filter |
| `get_product` | Retrieve product details, GTIN/UPC, local shelf price, and instant checkout URL (`https://shop.jennipro.com/p/{productId}`) |
| `check_availability` | Verify real-time local store stock and calculate 1-hour courier delivery quote for any US ZIP code |
| `create_checkout` | Generate a Stripe-backed checkout session for same-day local courier delivery |

## Docs

- Storefront: https://shop.jennipro.com
- WebMCP Discovery: https://shop.jennipro.com/.well-known/mcp.json
- OpenAPI 3.1 Spec: https://shop.jennipro.com/openapi.json
- Server URL: https://shop.jennipro.com/mcp

## License

MIT
