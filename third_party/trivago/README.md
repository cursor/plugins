# trivago

Plugin that connects Cursor and Grok Bot agents to [trivago](https://www.trivago.com), the hotel metasearch site, through trivago's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search hotels and other accommodations by city, neighborhood, landmark, or property name for specific dates and guests. Each result carries up to three deals from different booking sites, with rate details such as free cancellation or breakfast included, plus photos, ratings, top amenities, and a link to each offer. A forecast tool shows how nightly prices move across months for a destination.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **trivago**.
3. Click **Install**.

Or run `/add-plugin trivago` in chat.

## MCP

```json
{
  "mcpServers": {
    "trivago": {
      "type": "http",
      "url": "https://mcp.trivago.com/mcp"
    }
  }
}
```

The server is public: there is no sign-in, API key, or client ID to configure, and no trivago account is needed.

## What agents can do

| Tool | Use it for |
| --- | --- |
| `trivago-accommodation-radius-search` | Hotels around coordinates: a city center, neighborhood, landmark, or venue. trivago's preferred search. |
| `trivago-accommodation-search` | A specific property by name, or a region or country too large for one point. |
| `trivago-destination-price-trends` | Average, minimum, and maximum nightly rates by star rating across a range of months. A forecast, not live availability. |

All three tools are read-only. Searches take dates, adults, children and their ages, rooms, and filters for star rating, guest rating, price range, and amenities. The server is the source of truth for tool names and schemas.

## Notes

- Results are live prices from trivago's metasearch. Booking happens on the provider's site through the returned links; the plugin cannot book or pay.
- Search results attach one photo per property, so a single call can return a large response.
- Tool results include formatting instructions from trivago for presenting hotels as cards.

## Docs

- trivago MCP: https://mcp.trivago.com/docs
- Server URL: https://mcp.trivago.com/mcp
- Support: mcp.support@trivago.com

## License

MIT
