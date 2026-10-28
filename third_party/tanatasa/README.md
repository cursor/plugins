# Tanatasa

Cursor plugin that connects agents to [Tanatasa](https://tanatasa.sg) through Tanatasa's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Shop Singapore beauty products in SGD, build guest carts, save approved contact and delivery details, prepare hosted Stripe payment after explicit buyer approval, and check webhook-confirmed purchase status.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Tanatasa**.
3. Click **Install**.

Or run `/add-plugin tanatasa` in chat.

## MCP

```json
{
  "mcpServers": {
    "tanatasa": {
      "type": "http",
      "url": "https://tanatasa.sg/mcp"
    }
  }
}
```

No sign-in is required. Guest carts work without an account; OAuth sign-in is optional.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Catalog | Search products and get product details with SGD pricing |
| Cart | Create a guest cart, set items and coupons, and quote totals |
| Checkout | Create a checkout, read it, and save approved contact and delivery details |
| Payment | Prepare a hosted Stripe payment link once the buyer confirms |
| Orders | Check purchase status confirmed by Stripe webhooks |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server never charges a card directly and never collects card details. Payment happens on a hosted Stripe page that the buyer opens.
- `prepare_payment` requires approved details and total, `buyer_confirmed=true`, and a stable idempotency key.
- Keep the `guest_token` returned by `create_cart` for later cart and checkout calls.

## Docs

- Tanatasa: https://tanatasa.sg
- Agent docs: https://tanatasa.sg/ai-agent-docs.md
- Server URL: https://tanatasa.sg/mcp

## License

MIT
