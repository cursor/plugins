# Finance

Grok Bot plugin that connects agents to the Grok **Finance** connector through its remote [Model Context Protocol](https://modelcontextprotocol.io/) server on the Grok connectors gateway.

Securely connect your accounts so Grok can help with questions about your spending, subscriptions, balances, and investments.

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
- **Your credentials stay private.** xAI does not store or view any bank account or password credentials.
- **Read-only access.** A financial connection is read-only, which means it can't be used to move money into or out of bank accounts.

Third-party connectors are not built or maintained by xAI. Use caution when granting access to external services. Review the permissions before connecting. Usage is subject to the [xAI Privacy Policy](https://x.ai/legal/privacy-policy).

## License

MIT
