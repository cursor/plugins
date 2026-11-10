# OnePay

Grok Bot plugin that connects agents to **OnePay** through OnePay's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Connect Grok to OnePay to better understand your finances. View balances across Banking, Credit Card, Pay Later, Invest, Crypto and OnePay @ Work. Drill into transactions by date, merchant, or category to understand your spending. Monitor your investment portfolio and crypto holdings alongside your cash. Whether you're reviewing last month's budget, analyzing a category of spending, or saving up for your next milestone, OnePay gives Grok real-time access to your data so you can review your financial life in one place.

The same server backs the OnePay listings in the [Claude directory](https://claude.ai/directory/onepay) and [ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_69fe0111610c8191981d05dd6a349820).

## Who can use it

- Grok Bot **0.49** or newer.
- Not available in Cursor. Cursor must not list or install this plugin.
- A OnePay account.

## MCP

```json
{
  "mcpServers": {
    "onepay": {
      "type": "http",
      "url": "https://mcp.onepay.com"
    }
  }
}
```

The server is OnePay's hosted MCP (Streamable HTTP, stateless). Sign-in is OAuth 2.1 with PKCE: an unauthenticated request returns `401` with `resource_metadata` pointing at `https://mcp.onepay.com/.well-known/oauth-protected-resource/mcp/v1`, the authorization server metadata is at `https://mcp.onepay.com/.well-known/oauth-authorization-server`, and the user signs in with OnePay and approves the requested scopes on OnePay's consent screen.

## Tools

The tools available are decided per account by OnePay. The public read-only set:

| Area | Tools |
| --- | --- |
| Accounts | `get_user_accounts`, `get_account_features` |
| Banking | `get_banking_transactions`, `get_savings_goals`, `get_pay_autosave_enrollment` |
| Credit card | `get_credit_card_summary`, `get_credit_card_transactions` |
| Credit score | `get_credit_score`, `get_credit_score_history`, `get_credit_score_factors` |
| Pay Later | `get_pay_later_summary`, `get_pay_later_transactions` |
| OnePay @ Work | `get_atwork_earnings`, `get_atwork_instapay_availability` |
| Invest | `get_invest_summary`, `get_invest_transactions` |
| Crypto | `get_crypto_summary`, `get_crypto_transactions` |
| Rewards | `get_rewards_summary`, `get_rewards_conversion_rates` |

## Routing rule

`rules/onepay.mdc` (always applied) sends questions about the user's own OnePay accounts to the `onepay` MCP tools and has the agent discover tools from the server's list.

## Try asking

- Analyze my spending from the past month and build me a budget to help me save.
- Help me understand how I can increase my credit score.
- Tell me how my stock and crypto investments are performing.

## About this connector

- **Ask about your finances in chat.** Balances, transactions, credit, Pay Later, investments, crypto, and rewards from your OnePay accounts.
- **What you share.** Signing in grants Grok the OnePay access you approve on OnePay's consent screen.
- **Your credentials stay private.** xAI never sees or stores your OnePay credentials.
- **Disconnect anytime.** Remove OnePay from the connector on grok.com.

Third-party connectors are not built or maintained by xAI. Use caution when granting access to external services. Review the permissions before connecting. Usage is subject to the [xAI Privacy Policy](https://x.ai/legal/privacy-policy).

## License

MIT
