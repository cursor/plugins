# DeepWiki

Cursor plugin that connects agents to [DeepWiki](https://docs.devin.ai/work-with-devin/deepwiki-mcp) through DeepWiki's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read AI-generated docs and ask questions about any public repo.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **DeepWiki**.
3. Click **Install**.

Or run `/add-plugin deepwiki` in chat.

## MCP

```json
{
  "mcpServers": {
    "deepwiki": {
      "type": "http",
      "url": "https://mcp.deepwiki.com/mcp"
    }
  }
}
```

No authentication is required; the server covers public repositories only.

## Before you connect

No account is needed. The server covers public GitHub repositories already indexed on deepwiki.com.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Structure | List the documentation topics for a repository |
| Contents | Read the generated wiki pages |
| Questions | Ask a grounded question about one or more repositories |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The public server needs no authentication. Private repositories use a different authenticated endpoint (`https://mcp.devin.ai/mcp`) that this plugin does not configure.
- Repositories must already be indexed on deepwiki.com.

## Docs

- DeepWiki MCP: https://docs.devin.ai/work-with-devin/deepwiki-mcp
- Server URL: https://mcp.deepwiki.com/mcp

Logo is DeepWiki's official mark.

## License

MIT
