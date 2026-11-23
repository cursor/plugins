# PayPal

Cursor plugin that connects agents to [PayPal](https://www.paypal.com) through PayPal's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Work with a PayPal business account — invoices, orders and refunds, subscription plans, catalog products, shipment tracking, disputes, and transaction history — through the PayPal API.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **PayPal**.
3. Click **Install**, then complete the PayPal sign-in prompt.

Or run `/add-plugin paypal` in chat.

## MCP

```json
{
  "mcpServers": {
    "paypal": {
      "type": "http",
      "url": "https://mcp.paypal.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with Dynamic Client Registration and PKCE. Cursor registers itself and prompts for PayPal sign-in when the plugin connects — there is no access token, client ID, or client secret to configure.

## What agents can do

| Area | Tools |
| --- | --- |
| Invoices | `create_invoice`, `list_invoices`, `get_invoice`, `send_invoice`, `send_invoice_reminder`, `cancel_sent_invoice`, `generate_invoice_qr_code` |
| Orders and payments | `create_order`, `get_order`, `pay_order`, `create_refund`, `get_refund` |
| Subscriptions | `create_subscription_plan`, `update_plan`, `list_subscription_plans`, `show_subscription_plan_details`, `create_subscription`, `show_subscription_details`, `update_subscription`, `cancel_subscription` |
| Catalog | `create_product`, `list_products`, `show_product_details`, `update_product` |
| Shipment tracking | `create_shipment_tracking`, `get_shipment_tracking` |
| Disputes | `list_disputes`, `get_dispute`, `accept_dispute_claim` |
| Reporting | `list_transactions` |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server reaches **production** data only. To test against a PayPal sandbox account, point at `https://mcp.sandbox.paypal.com/mcp` or run PayPal's local server (`npx -y @paypal/mcp --tools=all`) with a sandbox access token.
- The server can write as well as read — creating invoices, capturing payments, issuing refunds, and cancelling subscriptions are all tool calls. Approve each action deliberately.
- Agentic shopping tools (`search_product`, `create_cart`, `checkout_cart`) exist on the remote server but require the `x-feature-flags: commerce:true` request header, which this plugin does not send.

## Docs

- MCP server quickstart: https://developer.paypal.com/ai-tools/mcp-server
- Source (local server): https://github.com/paypal/paypal-mcp-server
- PayPal Developer Dashboard: https://developer.paypal.com/dashboard/
- Server URL: https://mcp.paypal.com/mcp

Logo is PayPal's official mark, from `paypalobjects.com`.

## License

MIT
