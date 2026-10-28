# Nordsynk for Fortnox

Cursor plugin that connects agents to [Fortnox](https://www.fortnox.se), the Swedish accounting system, through [Nordsynk](https://nordsynk.se/fortnox-mcp), a hosted [Model Context Protocol](https://modelcontextprotocol.io/) server from Nordbeam AB. Nordsynk is not made by Fortnox.

Read and prepare Fortnox invoices, vouchers, ledgers, and reports, with browser approval before changes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Nordsynk for Fortnox**.
3. Click **Install**, then complete the Nordsynk sign-in prompt and choose the Fortnox companies the agent may use.

Or run `/add-plugin nordsynk` in chat.

## MCP

```json
{
  "mcpServers": {
    "nordsynk": {
      "type": "http",
      "url": "https://mcp.nordsynk.se/mcp"
    }
  }
}
```

Auth is OAuth in the browser. There is no client ID or API key to configure, and Fortnox tokens are never shown to the agent.

## Before you connect

- A Fortnox account with access to the companies you want to use.
- A Nordsynk seat for each Fortnox company and user, bought in Fortnox Marketplace.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Invoices | Read customer and supplier invoices, and draft new invoices |
| Bookkeeping | Read vouchers (verifikationer) and the general ledger, and draft vouchers |
| Reports | Read Fortnox reports |
| Registers | Read customers, suppliers, and articles |

By default, every change becomes an approval request with a link to Nordsynk's approval page. Nothing is saved in Fortnox until the user approves it. A company admin can turn on automatic approval per company in Nordsynk's settings.

The hosted runtime is the source of truth for tool names and schemas.

## Skill

`skills/nordsynk-fortnox` tells the agent how to connect, pick a company, and handle approvals.

## Docs

- Nordsynk: https://nordsynk.se/fortnox-mcp
- Server URL: https://mcp.nordsynk.se/mcp
- Source plugin: https://github.com/nordbeam/nordsynk-fortnox-mcp
- Support: https://nordsynk.se/support · hello@nordbeam.io

Logo is `assets/logo.png` from the submitted `logo_url` in the publisher's repository (512×512).

## License

MIT
