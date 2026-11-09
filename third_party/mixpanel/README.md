# Mixpanel

Cursor plugin that connects agents to [Mixpanel](https://mixpanel.com) through Mixpanel's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query events, funnels, retention, and flows, and work with reports, dashboards, and Lexicon in the signed-in Mixpanel organization.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Mixpanel**.
3. Click **Install**, then complete the Mixpanel sign-in prompt.

Or run `/add-plugin mixpanel` in chat.

## MCP

```json
{
  "mcpServers": {
    "mixpanel": {
      "type": "http",
      "url": "https://mcp.mixpanel.com/mcp"
    }
  }
}
```

Auth is OAuth against Mixpanel. Cursor prompts for Mixpanel login when the plugin connects; there is no API key, Node, or `npx` to set up.

## Regions

This plugin uses the US endpoint. Projects in Mixpanel's EU or India data residency need their regional URL instead, added as a custom MCP server:

| Region | URL |
| --- | --- |
| US | `https://mcp.mixpanel.com/mcp` |
| EU | `https://mcp-eu.mixpanel.com/mcp` |
| India | `https://mcp-in.mixpanel.com/mcp` |

## Notes

- Tool calls run as the Mixpanel user who authorizes the connection and cannot exceed that user's project permissions.
- Mixpanel hosts the server itself; this plugin does not wrap a local stdio server.
- The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Mixpanel MCP: https://docs.mixpanel.com/docs/mcp
