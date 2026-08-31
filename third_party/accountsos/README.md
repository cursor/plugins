# AccountsOS

Cursor plugin that connects agents to [AccountsOS](https://accounts-os.com), an AI-native accounting platform for UK limited companies and sole traders, through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read and write accounting data (transactions, balances, VAT, deadlines, invoices, documents), and ship with auto-firing UK tax knowledge skills verified for the 2026/27 tax year.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **AccountsOS**.
3. Click **Install**, then set your API key (below).

Or run `/add-plugin accountsos` in chat.

## MCP

```json
{
  "mcpServers": {
    "accountsos": {
      "type": "http",
      "url": "https://accounts-os.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ${ACCOUNTSOS_API_KEY}"
      }
    }
  }
}
```

AccountsOS publishes a hosted MCP endpoint, so nothing runs locally and no npm download is needed. Authentication is a single API key sent as a Bearer token.

## Before you connect

1. Sign up at [accounts-os.com](https://accounts-os.com/signup) (free to start).
2. Create an API key under **Settings → API Keys** with `read` and `write` scopes.
3. Set the key in **Dashboard → Plugins → Configure**.

Agents can also self-signup via the [agent endpoint](https://accounts-os.com/skill.md).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Transactions | List, create, update, and categorise bank transactions |
| Balances & reports | Account balances, VAT summary, directors loan account |
| Deadlines | HMRC and Companies House filing deadlines, with penalty context |
| Invoices | Outstanding and overdue invoices |
| Documents | Search and upload receipts, invoices, and statements |

The server is the source of truth for tool names and schemas.

## Skills and commands

Unlike a bare MCP wrapper, this plugin also ships domain knowledge:

- **4 auto-firing skills** covering UK corporation tax, VAT and MTD rules, expense deductibility, and filing deadlines, with figures verified for the 2026/27 tax year against gov.uk.
- **6 slash commands**: `/weekly-check`, `/log-expense`, `/vat-check`, `/deadlines`, `/invoices`, `/categorize`.

## Notes

- The only network endpoint the plugin calls is `https://accounts-os.com/api/mcp`.
- The only credential is `ACCOUNTSOS_API_KEY`, created and revocable by the user in AccountsOS settings.
- No lifecycle hooks, no shell execution, no postinstall scripts. Skills and commands are plain markdown.
- Built for UK organisations. The platform itself supports 25 countries; the bundled tax skills are UK-specific.

## Docs

- AccountsOS: https://accounts-os.com
- Agent/API documentation: https://accounts-os.com/skill.md
- Plugin source: https://github.com/thriveventurelabs/accountsos-agent-plugin

## License

MIT
