# Wrike

Cursor plugin that connects agents to [Wrike](https://www.wrike.com) through Wrike's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search a Wrike workspace, navigate folder and project hierarchies, and create or update tasks, projects, and comments.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Wrike**.
3. Click **Install**, then set your Wrike permanent access token (below).

Or run `/add-plugin wrike` in chat.

## MCP

```json
{
  "mcpServers": {
    "wrike": {
      "type": "http",
      "url": "https://mcp.wrike.com/v2",
      "headers": {
        "Authorization": "Bearer ${WRIKE_ACCESS_TOKEN}"
      }
    }
  }
}
```

Auth is a Wrike **permanent access token** sent as a bearer token. Create one under **Apps & Integrations → API**, then set it in **Dashboard → Plugins → Configure**.

Wrike's MCP server does not offer Dynamic Client Registration, so a token is the supported path for clients like Cursor rather than a browser OAuth flow.

## Before you connect

Wrike MCP is available on all plans (Free, Team, Business, Pinnacle, and Apex). Creating the token requires Wrike API permissions, which Account Owners have by default.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | Unified search across the workspace |
| Navigation | Browse folders, projects, and spaces |
| Tasks | Create and update tasks, including bulk actions |
| Comments & inbox | Post comments and read the Wrike inbox |
| Metadata | Time logs, contacts, and custom fields |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions of the user who owns the token.
- `https://mcp.wrike.com/v2` is served over streamable HTTP only — there is no SSE fallback.
- The older `https://mcp.wrike.com/app/mcp/stream` and `https://mcp.wrike.com/app/mcp/sse` URLs are MCP v1 and serve an older tool set. Some Wrike pages still reference them.
- Wrike also supports connector-style OAuth using a client ID and secret from an OAuth app an admin creates. That path is aimed at hosted connectors rather than local clients.

## Docs

- Wrike MCP server overview: https://developers.wrike.com/docs/wrike-mcp-server-overview
- Set up other MCP clients: https://developers.wrike.com/docs/setup-other-mcp-clients-with-wrike-mcp
- Wrike MCP (help center): https://help.wrike.com/hc/en-us/articles/34605829225746-Wrike-Model-Context-Protocol-MCP
- Server URL: https://mcp.wrike.com/v2

Logo is Wrike's official mark, from the `wrike` GitHub organization.

## License

MIT
