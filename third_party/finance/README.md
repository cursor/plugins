# Finance

Grok Bot plugin that connects agents to the Grok **Finance** connector through its remote [Model Context Protocol](https://modelcontextprotocol.io/) server on the Grok connectors gateway.

Link your bank, card, and investment accounts through Plaid so Grok can answer questions about balances, spending, subscriptions, and investments. You'll share contact details, account and balance info, transactions, credit and loans, and investments. Grok syncs and stores your linked account data so the connector can work, and Grok Bot's privacy mode still controls whether your conversations are stored or used for training. Access is read-only, xAI never sees or stores your bank login, and you can unlink accounts anytime from cursor.com.

## Who can use it

- Grok Bot **0.49** or newer.
- Not available in Cursor. Cursor must not list or install this plugin.

## MCP

```json
{
  "mcpServers": {
    "finance": {
      "type": "http",
      "url": "https://connectors-gateway.grok.com/gateway/v1/finance/mcp"
    }
  }
}
```

The server is hosted by xAI and authenticates with the Grok account linked to the caller. There is no sign-in prompt in the client: the Cursor backend attaches the linked account's credential when it dials this URL. Linking accounts on grok.com (Plaid) happens on grok.com; until an account is linked, the connector reports that it needs authorization.

## About this connector

- **See your finances in chat.** Ask about balances, recent spending, subscriptions, and investments across linked accounts.
- **What you share.** Linking through Plaid shares contact details, account and balance info, transactions, credit and loans, and investments with Grok so it can track and manage your finances.
- **Data sync.** Grok syncs and stores linked account data (balances, transactions, holdings) so the connector can answer questions; this sync is required for the connector to work. Grok Bot's privacy mode still controls whether conversations are stored or used for training.
- **Your credentials stay private.** xAI does not store or view any bank account or password credentials.
- **Read-only access.** A financial connection is read-only, which means it can't be used to move money into or out of bank accounts.
- **Unlink anytime.** Manage or remove linked accounts from the Finance page on cursor.com.

Third-party connectors are not built or maintained by xAI. Use caution when granting access to external services. Review the permissions before connecting. Usage is subject to the [xAI Privacy Policy](https://x.ai/legal/privacy-policy).

## License

MIT
