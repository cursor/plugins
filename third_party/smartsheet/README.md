# Smartsheet

Cursor plugin that connects agents to [Smartsheet](https://www.smartsheet.com) through Smartsheet's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find sheets, read and update rows and columns, and work with discussions and workspaces in your Smartsheet account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Smartsheet**.
3. Click **Install**, then set your Smartsheet API token (below).

Or run `/add-plugin smartsheet` in chat.

## MCP

```json
{
  "mcpServers": {
    "smartsheet": {
      "type": "http",
      "url": "https://mcp.smartsheet.com",
      "headers": {
        "Authorization": "Bearer ${SMARTSHEET_API_TOKEN}"
      }
    }
  }
}
```

Auth is a Smartsheet **API access token** sent as a bearer token. Generate one under **Account → Personal Settings → API Access**, then set it in **Dashboard → Plugins → Configure**.

## Before you connect

Smartsheet MCP requires a **Business**, **Enterprise**, or **Advanced Work Management** plan.

This plugin points at the US region. For other regions change the server URL to `https://mcp.smartsheet.eu` (Europe) or `https://mcp.smartsheet.au` (Australia).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Discovery | Search for sheets, reports, and dashboards across the account |
| Sheets | Read sheet contents and create new sheets |
| Rows & columns | Add, update, and delete rows and columns |
| Collaboration | Discussions, comments, and attachments |
| Workspaces & plan | Workspace management plus seat and license usage |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions of the user who owns the API token.
- Smartsheet's own Cursor instructions route through `npx mcp-remote`. That is unnecessary here — Cursor speaks streamable HTTP natively and sends the `Authorization` header directly.
- `smartsheet-platform/smar-mcp` on GitHub is a deprecated local server that aggregators still list. This plugin uses the hosted server Smartsheet now supports.

## Docs

- Smartsheet MCP server: https://developers.smartsheet.com/ai-mcp/smartsheet/mcp-server
- Install the Smartsheet MCP server: https://developers.smartsheet.com/ai-mcp/smartsheet/mcp-server/install-the-smartsheet-mcp-server
- Smartsheet MCP server (help center): https://help.smartsheet.com/articles/2483670-smartsheet-mcp-server
- Server URL: https://mcp.smartsheet.com

Logo is Smartsheet's official mark, from the `smartsheet` GitHub organization.

## License

MIT
