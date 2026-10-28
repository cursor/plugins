# SaaSFlow

Cursor plugin that connects agents to [SaaSFlow](https://saasflow.com) through SaaSFlow's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask about MRR, churn, cash, runway, and P&L for your SaaS company, and keep transactions, categories, and customers in SaaSFlow up to date. SaaSFlow combines subscription data from Stripe, PayPal, or other systems with your bank accounts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SaaSFlow**.
3. Click **Install**, then complete the SaaSFlow sign-in prompt.

Or run `/add-plugin saasflow` in chat.

## MCP

```json
{
  "mcpServers": {
    "saasflow": {
      "type": "http",
      "url": "https://mcp.saasflow.com"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. The server supports dynamic client registration and Client ID Metadata Documents, so Cursor prompts for SaaSFlow sign-in when the plugin connects. There is no client ID or API key to configure.

## Before you connect

You need a SaaSFlow account. Sign up at https://app.saasflow.com (no credit card needed). To try it without real data, tick **Create sample data** on the **Getting started** screen.

## What agents can do

- Answer questions about MRR, churn, cash, runway, and P&L. Metrics come from SaaSFlow's own calculations, not from the model adding up transactions.
- Update transactions, categories, and customers, when write access is allowed.

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Write access is off unless you tick **Make changes to company data** on the **Connect an app** screen when connecting.
- The connector never moves money.

## Docs

- SaaSFlow: https://saasflow.com
- Server URL: https://mcp.saasflow.com

The logo points at the submitted URL, `https://saasflow.com/press/saasflow-icon-1024.png`. saasflow.com was unreachable when this plugin was added, so no local copy is committed.

## License

MIT
