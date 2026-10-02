# X Money

Grok Bot plugin that connects agents to [X Money](https://x.com/i/money) through X Money's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server at `https://mcp.money.x.com/mcp`.

Use your X Money Card, send money to users on X, manage your finances, view your balance and browse through your transaction history.

## Who can use it

- Grok Bot **0.52** or newer.
- An active X Money account. X Money is available to eligible customers in the United States.
- Not available in Cursor. Cursor must not list or install this plugin.

## Install

1. Open **Grok Bot → Plugins**.
2. Search for **X Money**.
3. Click **Install**, then complete the X Money connection when prompted.

Or ask the agent to connect your X Money account.

## MCP

```json
{
  "mcpServers": {
    "x-money": {
      "type": "http",
      "url": "https://mcp.money.x.com/mcp",
      "placement": "server"
    }
  }
}
```

## Connecting

Auth is OAuth. There is no client ID, API key, or token to paste. Cursor completes the sign-in on your behalf.

1. Grok Bot opens the **Connect Grok Bot to X Money** page in a browser. It shows a connection code and a QR code.
2. Enter the code in the X Money app, or scan the QR code, and approve with your passkey.
3. The page confirms the connection and Grok Bot picks it up on its own.

The code is valid for about 5 minutes. You can revoke the connection at any time from **X → Money → Settings → Connections**.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Balances | Available balance of your X Money accounts |
| Transactions | Your transaction history, with optional filters |
| Payments | Send money to another X user, or ask another X user to pay you |
| Purchases | Pay a merchant online with an X Money virtual card |

X Money decides which actions are available for each account, so the set can differ between users.

## Approval

Every action that moves money is confirmed with you first. Before sending money, requesting money, or paying a merchant, the agent shows an Approve / Cancel prompt that states exactly who, how much, and what for. Nothing happens until you approve, and each action needs its own approval. X Money also enforces this on its side and refuses any such call that was not approved.

## Skill

`skills/x-money-guide/SKILL.md` gives the agent the approval rule above, the connection flow, how to guide you through connect, reconnect, and revoke, and what each X Money failure message means.

## Notes

- Payments and purchases made through this plugin are live and move real money.
- Every action passes the same X Money checks as the app, plus separate limits for agents. When X Money refuses an action, the agent relays the reason and does not retry.
- Higher-risk transfers stay in the X app and are not available to agents.
- Card details used for a purchase go straight to the merchant checkout and are never shown in chat.
- The agent never sees your X Money password, passkey, or bank credentials.

## Docs

- X Money: https://x.com/i/money
- Manage connected agents: https://x.com/i/money/settings/connections
- Server URL: https://mcp.money.x.com/mcp

Logo is X Money's official mark.

## License

MIT
