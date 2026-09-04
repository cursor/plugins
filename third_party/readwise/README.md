# Readwise

Cursor plugin that connects agents to [Readwise](https://readwise.io) through Readwise's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search everything you have read — hybrid semantic and full-text search across Readwise highlights and Reader documents — and save, tag, and triage new material.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Readwise**.
3. Click **Install**, then complete the Readwise sign-in prompt.

Or run `/add-plugin readwise` in chat.

## MCP

```json
{
  "mcpServers": {
    "readwise": {
      "type": "http",
      "url": "https://mcp2.readwise.io/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Readwise sign-in when the plugin connects — there is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Highlights | Search and list highlights, create new ones, and update or delete existing ones |
| Daily review | Pull the current daily review |
| Reader documents | Search, list, and read documents, and get their details and highlights |
| Triage | Save new documents, move between locations, and add or remove tags |

The hosted runtime is the source of truth for tool names and schemas. Call `readwise_get_daily_review` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Readwise user who authorizes the connection.
- The host is `mcp2.readwise.io`, not `mcp.readwise.io`.
- The `@readwise/readwise-mcp` npm package is Readwise's own older local server. It is deprecated, has no Reader support, and should not be used for new setups.

## Docs

- Readwise MCP: https://docs.readwise.io/tools/mcp
- Readwise MCP landing page: https://readwise.io/mcp
- Server URL: https://mcp2.readwise.io/mcp

Logo is Readwise's official mark, from the `readwiseio` GitHub organization.

## License

MIT
