# QuickBooks

Cursor plugin that connects agents to [QuickBooks Online](https://quickbooks.intuit.com) through Intuit's official [Model Context Protocol](https://modelcontextprotocol.io/) server, run locally by Cursor.

Read and write a QuickBooks Online company's accounting data — customers, vendors, invoices, estimates, bills, payments, journal entries, items, and financial reports.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **QuickBooks**.
3. Click **Install**, then set the Intuit app credentials, refresh token, realm ID, and environment (below).

Or run `/add-plugin quickbooks` in chat.

## MCP

```json
{
  "mcpServers": {
    "quickbooks": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "github:intuit/quickbooks-online-mcp-server"
      ],
      "env": {
        "QUICKBOOKS_CLIENT_ID": "${QUICKBOOKS_CLIENT_ID}",
        "QUICKBOOKS_CLIENT_SECRET": "${QUICKBOOKS_CLIENT_SECRET}",
        "QUICKBOOKS_REFRESH_TOKEN": "${QUICKBOOKS_REFRESH_TOKEN}",
        "QUICKBOOKS_REALM_ID": "${QUICKBOOKS_REALM_ID}",
        "QUICKBOOKS_ENVIRONMENT": "${QUICKBOOKS_ENVIRONMENT}"
      }
    }
  }
}
```

Intuit does not publish a generally available hosted MCP endpoint. Its official server is [`intuit/quickbooks-online-mcp-server`](https://github.com/intuit/quickbooks-online-mcp-server), a local stdio server that is not published to npm, so the plugin installs it straight from GitHub with `npx` and builds it on first run. It authenticates with OAuth 2.0 credentials from an app you register on the Intuit Developer Portal; Intuit does not offer per-user API keys, and the plugin ships no client secret of its own.

There is also a hosted server at `mcp.quickbooks.intuit.com`, but it is an invitation-only pilot for Intuit App Partners that requires IP allowlisting and restricted MCP scopes provisioned by an Intuit Solution Engineer, so this plugin does not use it.

## Before you connect

1. Sign in at [developer.intuit.com](https://developer.intuit.com) and create an app (or open an existing one) with the **QuickBooks Online Accounting** scope.
2. Copy the **Client ID** and **Client Secret** from **Keys & Credentials**. Development keys work with sandbox companies; Production keys are needed for a live company.
3. Get a refresh token and realm ID for the company you want to connect:
   - **Sandbox:** open the [OAuth 2.0 Playground](https://developer.intuit.com/app/developer/playground), select your app and the `com.intuit.quickbooks.accounting` scope, authorize a sandbox company, and copy the **refresh token** and **realm ID** it returns.
   - **Production:** Intuit rejects `localhost` redirect URIs for production apps, so complete the one-time handshake with a public HTTPS callback. The server's [Production Setup](https://github.com/intuit/quickbooks-online-mcp-server#production-setup) section documents doing this with a clone of the repo, `npm run auth`, and an ngrok tunnel; the tokens it writes to `.env` are the values you need.
4. Set all five values in **Dashboard → Plugins → Configure**, with **environment** set to `sandbox` or `production` to match the keys and company you used.

Refresh tokens expire after 100 days without use. The server refreshes them on demand, so a plugin that is used regularly stays connected; one that sits idle past the window needs a new token.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Customers & vendors | Customers, vendors, employees, and company info |
| Sales | Invoices (including PDF download), estimates, sales receipts, credit memos, refund receipts, and payments |
| Purchases | Bills, bill payments, purchases, purchase orders, and vendor credits |
| Banking | Deposits, transfers, and journal entries |
| Items & settings | Items, accounts, classes, departments, terms, payment methods, tax codes, tax rates, tax agencies, preferences, and attachments |
| Time | Time activities |
| Reports | Balance sheet, profit and loss, cash flow, trial balance, general ledger, customer sales, customer balance, aged receivables and payables, and vendor expenses |

Tool names follow a `{verb}_{entity}` convention (`create_invoice`, `search_customers`, `get_balance_sheet`). The server is the source of truth for tool names and schemas.

## Notes

- This is a local stdio server, so `npx`, Node.js, and `git` have to be available on the machine running Cursor. The first launch clones and compiles the server, which takes a little while; later launches reuse the `npx` cache.
- The server is an early preview from Intuit. Some capabilities and configuration may change before general availability.
- Intuit rotates refresh tokens. The server persists the rotated token to a `.env` file inside its install directory and prefers that over the configured value on later starts, so the value in Cursor's configuration can go stale without breaking the connection. Clearing the `npx` cache discards that file; if the connection then fails with an authorization error, generate a fresh refresh token and update the plugin configuration.
- Tool calls run against the single company the refresh token was issued for. To work with several companies, reconfigure the plugin with that company's token and realm ID.
- To narrow the surface, add `QUICKBOOKS_DISABLE_WRITE`, `QUICKBOOKS_DISABLE_UPDATE`, or `QUICKBOOKS_DISABLE_DELETE` set to `"true"` to the server's `env`; read tools are always registered.
- The npm packages `quickbooks-mcp`, `@pipeworx/mcp-quickbooks`, and `@mindstone/mcp-server-quickbooks` are community servers. None of them is Intuit's server.

## Docs

- QuickBooks Online MCP server: https://github.com/intuit/quickbooks-online-mcp-server
- Intuit's announcement of the local MCP server: https://medium.com/intuitdev/experiment-with-intuits-local-mcp-server-early-preview-b6240f8603f1
- OAuth 2.0 guide: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- OAuth 2.0 Playground: https://developer.intuit.com/app/developer/playground
- Hosted MCP pilot (invitation only): https://github.com/IntuitDeveloper/intuit-3p-ai-pilot

Logo is QuickBooks's official mark, from the `IntuitDeveloper` GitHub organization.

## License

MIT
