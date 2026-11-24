# Easyship

Cursor plugin that connects agents to [Easyship](https://www.easyship.com) — a shipping platform for ecommerce brands — through Easyship's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Compare rates across 550+ couriers in 200+ countries, create shipments and buy labels, validate addresses, book courier pickups, track parcels, and read billing and shipping analytics for an Easyship account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Easyship**.
3. Click **Install**, then complete the Easyship sign-in prompt.

Or run `/add-plugin easyship` in chat.

## MCP

```json
{
  "mcpServers": {
    "easyship": {
      "type": "http",
      "url": "https://mcp.easyship.com/mcp"
    }
  }
}
```

Auth is OAuth with PKCE and Dynamic Client Registration against `mcp.easyship.com`. Cursor registers itself and prompts for Easyship sign-in when the plugin connects — there is no API token or client ID to configure. Permissions are granted when you click **Authorize**.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Rates | Compare couriers by price, delivery time, and tax and duty estimate |
| Shipments | Create, update, delete, and cancel shipments, list and look up shipments, and fetch shipping documents such as commercial invoices |
| Labels | Buy a label for an existing shipment, or buy it in the same call that creates the shipment |
| Tracking | Status, ETA, and checkpoint history by shipment ID or order number |
| Pickups | Find courier pickup slots, book and cancel pickups, and list the shipments in a pickup |
| Addresses | Validate and correct US and international addresses |
| Billing | Account transactions, and the line items on a billing document |
| Analytics | Shipment volume and trends, shipped activity, status breakdown, and top couriers, destinations, and sales channels |

The server is the source of truth for tool names and schemas. Call `list_shipments` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Easyship user who authorizes the connection and are scoped to that user's account.
- Buying a label (`create_label`, or `create_shipment` / `update_shipment` with label purchase) charges the Easyship account. Ask for a draft shipment first if you want to review rates before paying.
- `delete_shipment`, `cancel_shipment`, and `cancel_pickup` change live shipments and pickups. Confirm the ID and current status before running them.
- Easyship describes the server as a stateless proxy to the Easyship API that logs only request metadata (endpoint, status code, session ID).

## Docs

- Easyship MCP server: https://developers.easyship.com/docs/easyship-mcp-server
- Easyship API: https://developers.easyship.com
- Server URL: https://mcp.easyship.com/mcp

Logo is Easyship's official mark, from `github.com/easyship/easyship-mcp-plugin`.

## License

MIT
