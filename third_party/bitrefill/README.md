# Bitrefill

Cursor plugin that connects agents to [Bitrefill](https://www.bitrefill.com) through Bitrefill's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, plus the `bitrefill` agent skill.

Browse and buy gift cards, mobile top-ups and eSIMs from 1,500+ brands in 180+ countries. Pay by card, crypto or Bitrefill balance. Purchases confirm with you before paying.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Bitrefill**.
3. Click **Install**, then complete the Bitrefill sign-in prompt.

Or run `/add-plugin bitrefill` in chat.

## MCP

```json
{
  "mcpServers": {
    "bitrefill": {
      "type": "http",
      "url": "https://api.bitrefill.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth: Cursor prompts for Bitrefill sign-in when the plugin connects. Without an account, agents can still quote products and hand back a card checkout link or crypto payment address.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Browse | Search gift cards, mobile top-ups, and eSIMs by brand, country, and amount |
| Buy | Quote a purchase, confirm it with you, then pay with Bitrefill balance, card, or crypto |
| Deliver | Return gift card codes, top-up confirmations, and eSIM details |

The hosted runtime is the source of truth for tool names and schemas.

## Skill

`skills/bitrefill` is copied from [bitrefill/agents](https://github.com/bitrefill/agents). It routes each request to the right Bitrefill touchpoint and wallet, and confirms every purchase with you before paying.

## Notes

- Purchases are real and gift card codes are non-refundable once delivered.
- Tool calls run under the Bitrefill account of the user who authorizes the connection.

## Docs

- Bitrefill: https://www.bitrefill.com
- Docs: https://docs.bitrefill.com
- Source: https://github.com/bitrefill/agents
- Server URL: https://api.bitrefill.com/mcp

Logo is `assets/logo.png` from the bitrefill/agents repository.

## License

MIT
