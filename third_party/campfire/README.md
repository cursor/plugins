# Campfire

Cursor plugin that connects agents to [Campfire](https://campfire.ai) — an AI-native ERP for finance and accounting teams — through Campfire's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read a company's live Campfire books: financial statements, the general ledger, AR and AP, revenue recognition, budgets, fixed assets, leases, and the month-end close checklist. Agents can also hand questions to Ember, Campfire's built-in finance agent.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Campfire**.
3. Click **Install**, then complete the Campfire sign-in prompt.

Or run `/add-plugin campfire` in chat.

## MCP

```json
{
  "mcpServers": {
    "campfire": {
      "type": "http",
      "url": "https://api.meetcampfire.com/mcp"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration against `api.meetcampfire.com`. Cursor registers itself and prompts for Campfire sign-in when the plugin connects — there is no API key or client ID to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Financial statements | Income statement, balance sheet, cash flow statement, comparative and budget-vs-actual views, and trial balance |
| General ledger | Chart of accounts, GL transactions, journal entries, entities, departments, and tags |
| AR & AP | Invoices, bills, credit and debit memos, aging reports, vendors, customers, and payment terms |
| Analysis | Revenue, cash, and expenses by customer, vendor, or department, plus deferred, unearned, and prepaid balances |
| Revenue recognition | ASC 606 contracts, contract line items, and revenue schedules |
| Assets & schedules | Fixed assets, ASC 842 leases, amortizations, and budgets |
| Close | Month-end close checklist and the approvals queue |
| Ember | Ask Campfire's finance agent questions, answer its follow-ups, and pick a custom agent |
| Help & support | Search Campfire help docs and read your company's support cases |

The server is the source of truth for tool names and schemas. Call `get_current_user` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Campfire user who authorizes the connection and are scoped to that user's workspace.
- The record and report tools are read-only. Only the Ember tools are marked as non-read-only, because they start and steer Ember conversations.
- Campfire stores optional tool-call context (a short user-intent summary) for its own product analytics. Do not include credentials or sensitive personal information in prompts.

## Docs

- Campfire: https://campfire.ai
- Server URL: https://api.meetcampfire.com/mcp

Logo is Campfire's official mark, from `campfire.ai`.

## License

MIT
