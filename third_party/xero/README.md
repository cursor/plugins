# Xero

Cursor plugin that connects agents to [Xero](https://www.xero.com) through Xero's official [Model Context Protocol](https://modelcontextprotocol.io/) server, run locally by Cursor.

Read and write a Xero organisation's accounting and payroll data — invoices, contacts, chart of accounts, payments, quotes, journals, reports, and timesheets.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Xero**.
3. Click **Install**, then set the Xero client ID and client secret (below).

Or run `/add-plugin xero` in chat.

## MCP

```json
{
  "mcpServers": {
    "xero": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@xeroapi/xero-mcp-server@latest"
      ],
      "env": {
        "XERO_CLIENT_ID": "${XERO_CLIENT_ID}",
        "XERO_CLIENT_SECRET": "${XERO_CLIENT_SECRET}"
      }
    }
  }
}
```

Xero does not publish a hosted MCP endpoint. Its official server runs locally over stdio and authenticates with a **Custom Connection** — Xero's machine-to-machine OAuth 2.0 flow — so the plugin takes a client ID and secret rather than prompting for browser sign-in.

## Before you connect

1. Sign in at [developer.xero.com](https://developer.xero.com) and create an app with the **Custom Connection** option.
2. Select the scopes up front. Connections created before 2026-04-29 use the bundled scope list; newer ones use the granular list. The server tries the bundled set first and falls back, so you usually do not need to set `XERO_SCOPES`.
3. Authorize the connection from the email Xero sends, and pick the organisation to connect.
4. Copy the **Client ID**, generate a **Client Secret**, and set both in **Dashboard → Plugins → Configure**.

A Custom Connection is bound to a single Xero organisation and is a paid add-on per organisation. Payroll tools require an NZ or UK organisation.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts & contacts | Chart of accounts, contacts, and contact groups |
| Sales & purchases | Invoices, quotes, credit notes, and payments |
| Banking | Bank transactions and manual journals |
| Items & tracking | Items and tracking categories |
| Reports | Profit and loss, balance sheet, trial balance, and aged receivables/payables |
| Payroll | Employees, leave, leave types, and timesheets (NZ and UK organisations) |

The server is the source of truth for tool names and schemas.

## Notes

- This is a local stdio server, so `npx` has to be available on the machine running Cursor. It downloads `@xeroapi/xero-mcp-server` on first run.
- Xero's own FAQ says the server works with any client supporting local stdio servers, and that its testing was done with Claude Desktop and Cursor.
- Tool calls run with the scopes granted to the Custom Connection, against the one organisation it is bound to. To work with several organisations, create a connection per organisation.
- To narrow the surface further, add a space-separated `XERO_SCOPES` value to the server's `env` — for example `accounting.invoices accounting.contacts accounting.settings`.
- `xero-mcp` by john-zhang-dev is a community package, and JAX is Xero's in-product assistant. Neither is this server.

## Docs

- Xero MCP server: https://github.com/XeroAPI/xero-mcp-server
- Xero AI and MCP: https://developer.xero.com/ai
- Custom Connections: https://developer.xero.com/documentation/guides/oauth2/custom-connections/
- npm package: https://www.npmjs.com/package/@xeroapi/xero-mcp-server

Logo is Xero's official mark, from the `XeroAPI` GitHub organization.

## License

MIT
