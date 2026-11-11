# Crossmint

Grok Bot plugin that connects agents to [Crossmint](https://www.crossmint.com)'s Menta agent checkout through Crossmint's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Tell Grok what to buy and where. Menta checks out for you at online stores worldwide and pays with a card you saved, within a spending limit you approved.

## Who can use it

- Grok Bot **0.49** or newer.
- Not listed in Cursor.
- A Menta account, or you create one at sign-in.

## MCP

```json
{
  "mcpServers": {
    "crossmint": {
      "type": "http",
      "url": "https://menta.crossmint.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. An unauthenticated request returns `401` with `resource_metadata` pointing at `https://menta.crossmint.com/.well-known/oauth-protected-resource/mcp` and the `commerce:invoke` scope. The authorization server is `https://login.menta.crossmint.com`. It supports dynamic client registration and Client ID Metadata Documents, so there is no client ID or key to configure. The sign-in and consent pages are branded Menta.

## Before you connect

Menta places real orders and charges your card. It pays only with a card saved on your Menta account and only within a spending limit you approved. When no limit covers a purchase, you approve one yourself in Crossmint's secure form. Grok can never approve or raise a spending limit.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Checkout | Start a checkout at an online store and report its progress |
| Store questions | Pass on what the store needs, like a size or a delivery time, and send your answer back |
| Payment | Pay from a spending limit you approved, or ask you to approve one in Crossmint's secure form |
| Orders | Check how a checkout is going, or cancel one |
| Cards and addresses | See each saved card's brand and last 4 digits, and read your delivery addresses when you or a store ask for them |

These capabilities come from Menta's help page. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Card numbers, verification codes, and passwords never go through the chat. When one is needed, you type it into Crossmint's secure form.
- Orders are in your name at the store, so changes and returns after an order is placed go through the store.
- Menta buys physical goods and places orders at online stores, for delivery or pickup. Some stores block automated browsers, so Menta can't check out at them.
- Manage cards in **Wallet**, addresses in **Addresses**, and see everything Menta has bought for you, from any assistant, in **Activity** on menta.crossmint.com.

## Docs

- Menta help: https://menta.crossmint.com/help
- Server URL: https://menta.crossmint.com/mcp
- Support: agents@crossmint.com

Logo is Crossmint's official mark, `crossmint-mark-gradient.svg` from https://www.crossmint.com/brand, centered on a square canvas.

## License

MIT
