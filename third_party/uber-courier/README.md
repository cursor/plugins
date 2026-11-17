# Uber Courier

Cursor plugin that connects Grok Bot to [Uber Courier](https://www.uber.com/us/en/courier/) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Get a price for a package delivery, book it on the signed-in Uber account, check its state, and cancel it. Booking and canceling ask you before they run.

## Install

1. Open **Grok Bot Settings → Plugins**.
2. Search for **Uber Courier**.
3. Click **Install**, then complete the Uber sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "uber-courier": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/uber/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Uber with the scopes `profile` and `3p.demand.fulfillment.courier`. Grok Bot prompts for Uber sign-in when the plugin connects. Booking charges the payment method on that Uber account.

Fares expire in a few minutes. Booking re-checks the price and books nothing if it rose above the price you approved. Booked does not mean a courier is assigned yet. For the courier's arrival time, a delivery PIN, messaging, photos, tips, or support, use the Uber app.

## Tools

- **Estimates:** `get_courier_estimates`
- **Orders:** `create_courier_order`, `get_courier_order`, `cancel_courier_order`

`create_courier_order` and `cancel_courier_order` always ask before they run. A cancellation fee may apply once a courier is on the way.

## Docs

- Uber Courier: https://www.uber.com/us/en/courier/
- Courier terms: https://www.uber.com/us/en/legal/courier-terms-and-conditions/

Logo is Uber's official wordmark, placed on a white tile with padding so it reads well in the UI.
