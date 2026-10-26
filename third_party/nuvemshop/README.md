# Nuvemshop

Cursor plugin that connects agents to an existing [Nuvemshop](https://www.nuvemshop.com.br) store through Nuvemshop's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and manage products, update inventory and prices, organize categories, create coupons and promotions, review orders and customers, and check payment and shipping options. Designed for Portuguese-speaking merchants in Brazil.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Nuvemshop**.
3. Click **Install**, then complete the Nuvemshop sign-in prompt.

Or run `/add-plugin nuvemshop` in chat.

## MCP

```json
{
  "mcpServers": {
    "nuvemshop": {
      "type": "http",
      "url": "https://admin-mcp.nuvemshop.com.br/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Nuvemshop sign-in when the plugin connects. Each authenticated connection operates on one store.

## Before you connect

You need a Nuvemshop store and an account that can authorize apps on it. Use a test store to try the plugin before connecting a live store.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Products | Search and manage products, update inventory and prices |
| Categories | Organize the store's categories |
| Promotions | Create coupons and promotions |
| Orders and customers | Review orders and customers |
| Store settings | Check payment and shipping options |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the permissions of the user who authorizes the connection, against the store they selected.
- Several tools change store data (prices, stock, coupons). Review write actions before approving them.

## Docs

- Nuvemshop: https://www.nuvemshop.com.br
- Server URL: https://admin-mcp.nuvemshop.com.br/mcp

Logo is the Tiendanube/Nuvemshop mark from the `TiendaNube` GitHub organization (256×256). The submitted App Store icon URL and nuvemshop.com.br could not be reached when this plugin was added.

## License

MIT
