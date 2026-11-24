# BILL

Cursor plugin that connects agents to [BILL](https://www.bill.com) through BILL's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask about payables, payments, receivables, and card spend — what you owe, what you have paid, what you are owed, and where card money is going — within your own BILL permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **BILL**.
3. Click **Install**, then complete the BILL sign-in prompt and pick an organization.

Or run `/add-plugin bill` in chat.

## MCP

```json
{
  "mcpServers": {
    "bill": {
      "type": "http",
      "url": "https://gateway.prod.bill.com/ai-mcp-server/v1"
    }
  }
}
```

Auth is OAuth against `auth.bill.com`. BILL identifies clients by a published Client ID Metadata Document rather than Dynamic Client Registration, so there is no API key or client ID to configure.

## Before you connect

You need an active BILL account in a US-based organization. No admin role is required.

BILL does not currently support partner organizations, international organizations, or acting on multiple managed organizations within one Accountant Console session.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Payables | Search bills by vendor, due date, amount, and approval or payment status; line items, approvers, credits, and recurring templates |
| Payments | Search outgoing payments by vendor, date, amount, or status; disbursement and delivery status, voidability, and lookup by confirmation number |
| Receivables | Search invoices by customer, status, dates, or outstanding amount; lookup by invoice number |
| Card spend | Search Spend & Expense transactions by date, amount, merchant, card, budget, or cardholder |

The server is the source of truth for tool names and schemas.

## Notes

- Every call runs as the BILL user who signs in, against that user's existing BILL role. Card spend needs Spend & Expense access.
- The server is read-only for now. Creating, editing, approving, and paying are not available.
- One organization per connection, chosen at sign-in. To switch, disconnect and reconnect.
- Connections can be reviewed and revoked in BILL under **profile icon → Connected apps**.
- BILL labels the MCP server as beta, so the tool catalog can change.

## Docs

- BILL MCP server: https://developer.bill.com/docs/bill-mcp-server
- Server URL: https://gateway.prod.bill.com/ai-mcp-server/v1

Logo is BILL's official mark, from `bill.com`.

## License

MIT
