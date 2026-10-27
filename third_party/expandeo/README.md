# Expandeo

Cursor plugin that connects agents to [Expandeo](https://www.expandeo.com/agentic-shopping) through Expandeo's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Expandeo.com is a price comparison service for e-shops in 22 countries in Europe and in the United States. Agents can search products by name, model, brand, or EAN, list offers from cheapest to most expensive (including price per kg, liter, or piece), compare products, find cheaper alternatives, and check price history to judge whether the current price is a good deal.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Expandeo**.
3. Click **Install**.

Or run `/add-plugin expandeo` in chat.

## MCP

```json
{
  "mcpServers": {
    "expandeo": {
      "type": "http",
      "url": "https://mcp.expandeo.com"
    }
  }
}
```

The server uses Streamable HTTP with no auth. It exposes five read-only tools and needs no account or API key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Find products by name, model, brand, or EAN |
| Offers | List all offers sorted from cheapest, with unit prices per kg, liter, or piece |
| Compare | Compare products side by side and find cheaper alternatives |
| Price history | Show price history and rate whether the current price is a good deal |

The hosted runtime is the source of truth for tool names and schemas.

## Example prompts

- "Where is LEGO Technic 42213 Ford Bronco cheapest in Czechia?"
- "Is LEGO Botanicals 11504 Anthurium a good deal in Poland? Show its 6-month price history."
- "Compare Apple Watch Series 11 46mm, Samsung Galaxy Watch 8 44mm and Garmin Forerunner 265 in Poland."

## Notes

- Prices come from e-shop feeds and are usually updated daily.
- Results are sorted by price, never by payment from e-shops.
- Offer links go to the e-shop through an Expandeo redirect.

## Docs

- Expandeo: https://www.expandeo.com/agentic-shopping
- Server URL: https://mcp.expandeo.com

## License

MIT
