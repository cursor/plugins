# Bookipi

Cursor plugin that connects agents to [Bookipi](https://bookipi.com) through Bookipi's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run your small business from the conversation: create and send invoices, chase overdue payments, log expenses and receipts, manage customers, deals, proposals and eSign contracts, take card payments through payment links, edit and publish your business website, and pull revenue reports, dashboards and plain-language insights from your own Bookipi account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Bookipi**.
3. Click **Install**, then complete the Bookipi sign-in prompt.

Or run `/add-plugin bookipi` in chat.

## MCP

```json
{
  "mcpServers": {
    "bookipi": {
      "type": "http",
      "url": "http://mcp.bkpi.co/mcp"
    }
  }
}
```

Auth is OAuth with your Bookipi account. Cursor prompts for Bookipi sign-in when the plugin connects.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Invoicing | Create and send invoices, chase overdue payments |
| Expenses | Log expenses and receipts |
| CRM | Manage customers, deals, proposals, and eSign contracts |
| Payments | Take card payments through payment links |
| Website | Edit and publish your business website |
| Reports | Revenue reports, dashboards, and plain-language insights |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Actions that send, record a payment, or publish ask for confirmation first. No tool moves money.
- Tool calls run under the Bookipi account of the user who authorizes the connection.

## Docs

- Bookipi: https://bookipi.com
- Server URL: http://mcp.bkpi.co/mcp

Logo is Bookipi's logotype, downloaded from the URL Bookipi provided with the submission.

## License

MIT
