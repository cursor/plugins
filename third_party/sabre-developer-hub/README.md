# Sabre Developer Hub

Cursor plugin that connects agents to [Sabre Developer Hub](https://developer.sabre.com) through Sabre's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server, the Developer Hub Documentation MCP server.

Search Sabre's APIs, SDKs, product collections, and guides by name or content; read documentation pages and REST API OpenAPI specs; see what changed most recently; and load Sabre-published agent skills for implementing authentication, air search, and hotel search, debugging errors, mentoring, and the *New to Sabre* training course.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Sabre Developer Hub**.
3. Click **Install**.

Or run `/add-plugin sabre-developer-hub` in chat.

## MCP

```json
{
  "mcpServers": {
    "sabre-developer-hub": {
      "type": "http",
      "url": "https://developer.mcp.sabre.com/mcp",
      "headers": {
        "X-Cursor-Plugin": "sabre-developer-hub"
      }
    }
  }
}
```

No authentication is required. The server serves only Sabre's publicly available Developer Hub content and is read-only, so there is no token, PCC, or account to configure. The static `X-Cursor-Plugin` header carries no credentials; it tells hosts to treat the server as anonymous.

## What agents can do

| Area | Tools |
| --- | --- |
| Search | `look_for_named_sabre_documentation`, `look_for_artifact_content` |
| Read | `get_artifact_details`, `get_documentation_page`, `get_spec_file` |
| What's new | `get_latest_updated_documentation` |
| Skills | `get_skill` |

`get_skill` with no arguments lists Sabre's skills; at the time of writing they were `sabre-authentication`, `sabre-air-search`, `sabre-hotel-search`, `sabre-mentor`, and `new-to-sabre-training`. The server's instructions ask agents to load the matching skill before implementing or debugging a Sabre integration, and to keep using the documentation tools for live API details.

The server listed 7 tools at the time of writing and is the source of truth for tool names and schemas.

## Notes

- This is the documentation server only. It does not call Sabre's travel APIs, shop fares, or book anything. Sabre's separate [MCP Server](https://developer.sabre.com/product-collection/mcp-server/1.0/about.html) for live air and hotel APIs is not configured by this plugin.
- `get_spec_file` only supports REST API artifacts (URIs starting with `rest-api/`).
- Sabre's docs show the server's tools under slightly different names in places (for example `grab_html_content_from_documentation_links`); the live server currently exposes `get_documentation_page` for reading pages.

## Docs

- Developer Hub Documentation MCP server: https://developer.sabre.com/product-collection/inside-developer-hub/v1/help-documentation/documentation-mcp-server.html
- Sabre Developer Hub: https://developer.sabre.com
- Server URL: https://developer.mcp.sabre.com/mcp

Logo is the Sabre mark from the Developer Hub favicon, in white on the red of the sabre.com favicon.

## License

MIT
