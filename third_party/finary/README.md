# Finary

Cursor plugin that connects agents to [Finary](https://finary.com) through Finary's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your net worth, accounts, holdings, spending, and budgets.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Finary**.
3. Click **Install**, then complete the Finary sign-in prompt.

Or run `/add-plugin finary` in chat.

## MCP

```json
{
  "mcpServers": {
    "finary": {
      "type": "http",
      "url": "https://public-api.finary.com/mcp"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration and PKCE. Cursor registers itself and opens Finary's sign-in when the plugin connects: sign in with your Finary account, review the list of data the assistant can read, and authorize read-only access. There is no API key, client ID, or banking credential to configure.

## Before you connect

You need a Finary account. The connector reads what is already in Finary, so link your bank, brokerage, and other accounts in Finary first.

## What agents can do

The connector reads the signed-in user's Finary data:

| Area | Data |
| --- | --- |
| Net worth | Total wealth and its allocation, including the split per family member |
| Accounts and assets | Accounts, holdings and positions, property, loans, and other assets |
| Investments | Fees per fund and compounding simulations |
| Cash flow | Income, spending, and budgets, with up to two years of history |
| Planning | Goals and plans |
| Profile | Family members and companies added in Finary, name, email, and linked-account status |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The connector is read-only. It cannot place orders, make transfers, or change or delete anything in Finary.
- It only reads the signed-in user's own data.
- Answers describe your wealth and are not investment advice.
- To disconnect, remove the plugin or revoke access from your Finary account. Revocation takes effect immediately, and reconnecting requires authorizing again.

## Docs

- Finary MCP page: https://finary.com/en/mcp
- Setup guide: https://help.finary.com/en/articles/16335735-using-the-finary-mcp-with-my-ai-assistant-claude-chatgpt-perplexity-mistral
- Server URL: https://public-api.finary.com/mcp

Logo is Finary's official mark.

## License

MIT
