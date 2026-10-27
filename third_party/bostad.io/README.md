# Bostad.io

Cursor plugin that connects agents to [Bostad.io](https://bostad.io) through Bostad.io's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search homes for sale in Sweden from participating estate agents. Describe what you want in plain language (for example "bastu" or "sjöutsikt") and rank by preferences such as closest to water, largest living area, lowest monthly fee, or longest on the market.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Bostad.io**.
3. Click **Install**.

Or run `/add-plugin bostad.io` in chat.

## MCP

```json
{
  "mcpServers": {
    "bostad.io": {
      "type": "http",
      "url": "https://api.bostad.io/mcp"
    }
  }
}
```

The server uses Streamable HTTP. It's free and needs no sign-in or API key.

## What agents can do

| Tool | What it does |
| --- | --- |
| `list_coverage` | List the Swedish municipalities Bostad.io covers |
| `list_search_fields` | List the fields and preferences you can search and rank by |
| `search_listings` | Search listings and return up to 5 broker links, each with a relevance score and evidence for the match |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Results are links to the broker's own listing page. Bostad.io does not return prices, sizes, addresses, or listing text; those are on the broker's page.
- Show the returned links unchanged. They end in `?utm_source=bostad.io&utm_medium=semantic`.

## Docs

- Bostad.io for agents: https://bostad.io/for-agents
- Server URL: https://api.bostad.io/mcp
- Contact: hello@bostad.io

The logo is the avatar of the `bostad-io` GitHub organization (256×256). The submitted logo, https://bostad.io/bostad-icon-plate.svg, could not be downloaded when this plugin was added.

## License

MIT
