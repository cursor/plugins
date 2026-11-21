# Keenable

Cursor plugin that connects agents to [Keenable](https://keenable.ai) through Keenable's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search the web and fetch pages as clean markdown. No signup or API key is required.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Keenable**.
3. Click **Install**.

Or run `/add-plugin keenable` in chat.

## MCP

```json
{
  "mcpServers": {
    "keenable": {
      "type": "http",
      "url": "https://api.keenable.ai/mcp"
    }
  }
}
```

This matches Keenable's one-click Cursor install: the hosted Streamable HTTP server at `https://api.keenable.ai/mcp`, with no headers. The server answers on the shared public tier. An optional `X-API-Key` header (`keen_…`) removes the hourly request cap and attributes usage to a Keenable account; this plugin does not send one.

## What agents can do

| Tool | Capabilities |
| --- | --- |
| `search_web_pages` | Ranked results with titles, URLs, and snippets. Filter by site, publish date, or index time. `pro` (default) or `realtime`. |
| `fetch_page_content` | Read a URL as clean markdown. `live` fetches the source directly, including URLs that are not in the index. An optional `prompt` returns only the extracted answer. |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Unauthenticated calls are limited to 1,000 requests per hour and 10 requests per second per IP. A key removes the hourly cap; authenticated calls are 10 requests per second per organization and draw on that account's monthly allowance.
- `fetch_page_content` returns Keenable's indexed copy unless `live` is true. It is not a general scraper by default.
- Search snippets are usually enough. Fetch a page when the snippet is short, the user names a URL, or the answer needs exact wording.

## Docs

- Keenable MCP: https://docs.keenable.ai/mcp-server
- Authentication: https://docs.keenable.ai/authentication
- Rate limits: https://docs.keenable.ai/rate-limits
- Server URL: https://api.keenable.ai/mcp

Logo is Keenable's official mark, from https://github.com/keenableai/keenable-mcp (`assets/logo.png`).

## License

MIT
