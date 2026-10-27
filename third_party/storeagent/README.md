# StoreAgent

Cursor plugin that connects agents to your WooCommerce store through [StoreAgent](https://storeagent.ai)'s hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find products, write descriptions, generate alt text and tags, create coupons, summarize reviews, check orders, and change chat widget settings on your live store.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **StoreAgent**.
3. Click **Install**, then complete the sign-in prompt on your store.

Or run `/add-plugin storeagent` in chat.

## MCP

```json
{
  "mcpServers": {
    "storeagent": {
      "type": "http",
      "url": "https://api.storeagent.ai/mcp/<store-domain>"
    }
  }
}
```

Each store gets its own endpoint. Replace `<store-domain>` with your store's domain (for example `https://api.storeagent.ai/mcp/shop.example.com`).

Auth is OAuth on your own store. On the consent screen you choose read-only or read-write access.

## Before you connect

You need a WooCommerce store with the StoreAgent plugin installed. MCP access is included on every StoreAgent plan.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Products | Find products, write descriptions, generate alt text and tags, suggest upsells and cross-sells |
| Marketing | Create coupons |
| Customers | Summarize reviews and recent chat questions |
| Orders | Check recent orders and their status |
| Chat widget | Change StoreAgent chat widget settings |

The server exposes every AI ability registered on the site: WooCommerce core, any plugin that publishes abilities, and StoreAgent's built-in abilities. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run against your live store with the access level you approved.
- Every call is recorded in a 30-day activity log under **wp-admin → StoreAgent → Settings → MCP**.

## Docs

- StoreAgent: https://storeagent.ai
- Server URL: https://api.storeagent.ai/mcp/<store-domain>

The logo points at StoreAgent's favicon URL. storeagent.ai was unreachable when this plugin was added, so no local logo file is committed.

## License

MIT
