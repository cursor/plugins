# FreshBooks

Cursor plugin that connects agents to [FreshBooks](https://www.freshbooks.com) through FreshBooks' official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Work with a FreshBooks business's invoicing and accounting data — clients, invoices, estimates, payments, expenses, bills, projects, time entries, and reports — within your own FreshBooks permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FreshBooks**.
3. Click **Install**, then complete the FreshBooks sign-in prompt.

Or run `/add-plugin freshbooks` in chat.

## MCP

```json
{
  "mcpServers": {
    "freshbooks": {
      "type": "http",
      "url": "https://mcp.freshbooks.com/v1"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration against `auth.freshbooks.com`. Cursor registers itself and prompts for FreshBooks sign-in when the plugin connects — there is no API key or client ID to configure.

## What agents can do

The server groups access into read and write scopes that FreshBooks shows on the consent screen:

| Scope | Covers |
| --- | --- |
| `mcp:all:read` | Read access across the account |
| `mcp:revenue:write` | Clients, invoices, estimates, and payments |
| `mcp:payables:write` | Expenses, bills, and vendors |
| `mcp:operations:write` | Projects and time tracking |
| `mcp:books:write` | Accounting records such as journal entries |

The server is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the FreshBooks user who authorizes the connection and are limited to what that user can already see and do.
- Write scopes can create and change real financial records, such as sending invoices or recording payments. Review what the agent proposes before confirming.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking the app in FreshBooks ends Cursor's access to your data.

## Docs

- FreshBooks: https://www.freshbooks.com
- FreshBooks API: https://www.freshbooks.com/api
- Server URL: https://mcp.freshbooks.com/v1

Logo is FreshBooks' official mark, from the `freshbooks` GitHub organization.

## License

MIT
