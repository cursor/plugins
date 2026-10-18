# QuickBooks Online

Cursor plugin that connects agents to [QuickBooks Online](https://quickbooks.intuit.com) — Intuit's cloud accounting product — through Intuit's remote [Model Context Protocol](https://modelcontextprotocol.io/) server, which Cursor credentials for you.

Read a company file's accounting data: invoices, bills, expenses, payments, customers and vendors, the chart of accounts, journal entries, and the standard financial reports.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **QuickBooks Online**.
3. Click **Install**, then sign in to Intuit when Cursor prompts you.

Or run `/add-plugin quickbooks-online` in chat.

## MCP

```json
{
  "mcpServers": {
    "quickbooks-online": {
      "type": "http",
      "url": "https://mcp-e2e.quickbooks.intuit.com/mcp"
    }
  }
}
```

Intuit hosts the server. Auth is OAuth against Intuit, which Cursor runs when the plugin connects — there is no command to run, and no API key or client secret to paste.

## Before you connect

Nothing to prepare. Cursor owns the OAuth client, so you do not need an Intuit developer account or an app of your own.

You will be asked to sign in to Intuit and pick a company. Authorization is per company file — connect once per company you want agents to reach, and grant only the ones you intend to expose.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Accounts | Chart of accounts and company information |
| Contacts | Customers, vendors, and employees |
| Sales | Invoices, credit memos, and payments received |
| Purchases | Bills, expenses, purchase orders, and payments made |
| Banking | Bank transactions and journal entries |
| Items | Products, services, and tracking categories |
| Reports | Profit and loss, balance sheet, and cash flow statement |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows whatever the signed-in Intuit user can see. The connector cannot reach a company file that user has no access to.
- QuickBooks Online and QuickBooks Desktop are different products. This connector is for QuickBooks Online.
- Disconnecting is two independent steps: uninstalling the plugin stops Cursor from offering the server, and revoking the connection in Intuit's account settings ends Cursor's access to your data.

## Docs

- QuickBooks Online: https://quickbooks.intuit.com
- Intuit Developer: https://developer.intuit.com
- Model Context Protocol: https://modelcontextprotocol.io
- Server URL: https://mcp-e2e.quickbooks.intuit.com/mcp

Logo is QuickBooks' official mark, from `quickbooks.intuit.com`.

## License

MIT
