# VoriOS

Cursor plugin that connects agents to [Vori](https://vori.com) through VoriOS's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search products, analyze sales and inventory, review invoices, manage pricing and promotions, and streamline ordering for your grocery stores.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **VoriOS**.
3. Click **Install**, then complete the Vori sign-in prompt.

Or run `/add-plugin vori` in chat.

## MCP

```json
{
  "mcpServers": {
    "vori": {
      "type": "http",
      "url": "https://mcp.vori.com"
    }
  }
}
```

Cursor prompts you to sign in with your Vori account when the plugin connects. There is no API key to configure.

## Before you connect

You need a Vori account with access to at least one store.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Products | Search the product catalog for your stores |
| Sales and inventory | Analyze sales and inventory levels |
| Invoices | Review vendor invoices |
| Pricing and promotions | Review and manage prices and promotions |
| Ordering | Prepare and streamline orders |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Access is scoped to the stores and actions your Vori role allows.

## Docs

- Vori: https://vori.com
- VoriOS MCP docs: https://help.vori.com/mcp/introduction
- Server URL: https://mcp.vori.com

Logo is the Vori mark from the `voriteam` GitHub organization avatar (256×256). The submitted logo URL on `cdn.prod.website-files.com` and vori.com were unreachable when this plugin was added.

## License

MIT
