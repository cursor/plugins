# NEWT

Cursor plugin that connects agents to [NEWT](https://newt.net/), the Japanese travel booking service run by Reiwa Travel, Inc., through NEWT's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and compare overseas package tours and hotels on newt.net with live prices, availability, flights, hotel details, photos, and booking-page links.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **NEWT**.
3. Click **Install**.

Or run `/add-plugin reiwa-travel.inc` in chat.

## MCP

```json
{
  "mcpServers": {
    "newt": {
      "type": "http",
      "url": "https://mcp.newt.net/mcp"
    }
  }
}
```

The server uses Streamable HTTP and needs no sign-in or API key.

## What agents can do

| Category | Tools |
| --- | --- |
| Tours | `tour_search`, `tour_detail`, `tour_detail_calendar`, `tour_quotation` |
| Hotels | `hotel_search`, `hotel_detail`, `hotel_region_search`, `hotel_region_detail` |
| Destinations and airports | `destination_search`, `destination_detail`, `airport_search` |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Search and reference only. Bookings and payments are completed on newt.net.
- Prices and availability are a snapshot; confirm the final details on newt.net.
- Supported locales: `ja` (default), `en-US`, `ko`, `zh-Hant-TW`, `zh-Hant-HK`, `zh-Hans-CN`. Some text returns in Japanese.
- Use of the hosted server is governed by NEWT's [terms](https://github.com/reiwa-travel/newt-mcp-server/blob/main/TERMS.md).

## Docs

- NEWT: https://newt.net/
- Source: https://github.com/reiwa-travel/newt-mcp-server
- Server URL: https://mcp.newt.net/mcp

Logo is the Reiwa Travel mark from the `reiwa-travel` GitHub organization avatar. The submitted NEWT logo (`https://newt.imgix.net/product/logo/newt-logo.png`) could not be downloaded when this plugin was added.

## License

MIT
