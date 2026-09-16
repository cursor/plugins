# Craft

Cursor plugin that connects agents to [Craft](https://www.craft.do) through Craft's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, read, create, and update documents, daily notes, tasks, and collections in a connected Craft space.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Craft**.
3. Click **Install**, then complete the Craft sign-in prompt.

Or run `/add-plugin craft` in chat.

## MCP

```json
{
  "mcpServers": {
    "craft": {
      "type": "http",
      "url": "https://mcp.craft.do/my/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Craft sign-in when the plugin connects, and you pick which space to grant access to on the authorization screen.

## Before you connect

Create an MCP connection inside the Craft app first — open the **Connections** area in the sidebar. The endpoint will not authorize until that connection exists.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Cross-document search with tag, date, and regex filters |
| Documents | Create, read, update, and delete documents |
| Daily notes & tasks | Work with daily notes and task items |
| Collections | Manage collections, including schema edits |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls are scoped to the Craft space selected during authorization.
- The endpoint URL is the same for everyone — `https://mcp.craft.do/my/mcp`. Per-space scoping happens during OAuth approval, not in the URL.
- Because a connection is bound to one space, working across several spaces means adding one server entry per space.
- `stimmt/craft-mcp` on Packagist is an unrelated Craft **CMS** plugin.

## Docs

- Craft MCP guide: https://www.craft.do/imagine/guide/mcp
- Connect Craft to Cursor: https://www.craft.do/imagine/guide/mcp/cursor
- MCP support article: https://support.craft.do/en/integrate/mcp
- Server URL: https://mcp.craft.do/my/mcp

Logo is Craft's official mark, from the `craftdocs` GitHub organization.

## License

MIT
