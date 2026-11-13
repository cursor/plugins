# Squarespace

Cursor plugin that connects agents to [Squarespace](https://www.squarespace.com) through Squarespace's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Brainstorm business and brand names, then check domain availability, first-year and renewal pricing, and get a Squarespace checkout link for each one — without leaving chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Squarespace**.
3. Click **Install**.

Or run `/add-plugin squarespace` in chat.

There is nothing to sign in to: the tools this plugin exposes are public.

## MCP

```json
{
  "mcpServers": {
    "squarespace": {
      "type": "http",
      "url": "https://mcp.squarespace.com/mcp"
    }
  }
}
```

## What agents can do

| Tool | Purpose |
| --- | --- |
| `squarespace_generate_domain_names` | Turn a free-text description of a business into brandable name ideas, grouped by tone (neutral, playful, professional, friendly, informative, quirky) |
| `squarespace_search_domains` | Search the Squarespace domain catalog for a keyword or a full domain, returning availability, first-year price, renewal price, and a checkout link per result |

Both tools are read-only, and the hosted runtime is the source of truth for tool names and schemas.

The intended flow is to generate names first, then search the most promising ones. `squarespace_search_domains` takes a short keyword rather than a sentence, and only returns an `exactMatch` row when the query includes a TLD.

## Notes

- **Nothing is ever purchased.** The domain tools return a `checkoutLink`; a domain is registered only when someone opens that link and completes checkout on squarespace.com.
- Results can include **sponsored** placements. Each row carries a `suggestionType` of `exactMatch`, `sponsored`, or `organic`, and the server instructs agents to label sponsored rows as such rather than presenting them as organic suggestions.
- An `available` value of `null` means availability was not checked — not that the domain is taken. That happens when a search passes `checkAvailability: false`.
- Squarespace also hosts **Commerce** tools on this server (contacts, orders, products) behind a Squarespace sign-in. They are currently limited to Claude and ChatGPT, so they do not appear in Cursor. When they do open up, sign-in is OAuth 2.1 against `https://login.squarespace.com`, which advertises PKCE and client ID metadata documents but no dynamic client registration endpoint.

## Docs

- MCP server overview: https://developers.squarespace.com/mcp/overview
- Connecting a client: https://developers.squarespace.com/mcp/connect-a-client
- Domains tools: https://developers.squarespace.com/mcp/tools/domains
- Commerce tools: https://developers.squarespace.com/mcp/tools/commerce
- Server URL: https://mcp.squarespace.com/mcp

Logo is Squarespace's official mark, from the brand assets on `developers.squarespace.com`.

## License

MIT
