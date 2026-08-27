# Brex

Cursor plugin that connects agents to [Brex](https://www.brex.com) through Brex's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query company spend — expenses, receipts, bills, vendors, cards, balances, and travel — and annotate expenses, all within your own Brex permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Brex**.
3. Click **Install**, then complete the Brex sign-in prompt.

Or run `/add-plugin brex` in chat.

## MCP

```json
{
  "mcpServers": {
    "brex": {
      "type": "http",
      "url": "https://api.brex.com/mcp"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration. Cursor registers itself and prompts for Brex sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

Two one-time admin steps gate the whole account. An account or card admin has to accept the Developer API agreement under **Settings → Developer**, then enable **Brex in AI assistants** under **Settings → Beta features**. After that, any employee can connect with their own credentials.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Expenses | List and inspect expenses, run expense analytics, and browse expense and merchant categories |
| Bills & vendors | List and inspect bills, vendors, and payables |
| Cards & limits | Card details and spend limits |
| Banking | Account balances and cash details |
| Travel | Trips and bookings |
| Org | Users, departments, and locations |

The hosted runtime is the source of truth for tool names and schemas. Call `list_expense_categories` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Brex user who authorizes the connection and are scoped to that user's existing Brex capabilities.
- Writes are narrow: expense metadata such as memos, receipts, and attendees. The server cannot move money, issue cards, or pay bills.
- Approvals and card management are not exposed over MCP yet.
- Brex labels the MCP server as beta, so the tool catalog can change.

## Docs

- Brex MCP server: https://developer.brex.com/docs/mcp
- Server URL: https://api.brex.com/mcp

Logo is Brex's official mark, from the `brexhq` GitHub organization.

## License

MIT
