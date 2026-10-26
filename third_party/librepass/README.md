# LibrePass

Cursor plugin that connects agents to [LibrePass](https://librepass.co) through LibrePass's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find data-only travel eSIMs by country or region: network names, validity, data volume, and prices in EUR (VAT included), plus the local SIM-registration rules LibrePass has checked. The server is read-only. Agents never buy anything; each result links to librepass.co, where you complete the purchase.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **LibrePass**.
3. Click **Install**.

Or run `/add-plugin librepass` in chat.

## MCP

```json
{
  "mcpServers": {
    "librepass": {
      "type": "http",
      "url": "https://librepass.co/mcp/"
    }
  }
}
```

No account, API key, or sign-in is needed.

## What agents can do

| Tool | Capability |
| --- | --- |
| `search_countries` | Find a country or region LibrePass covers |
| `list_packages` | List eSIM packages for a country, with network, validity, data, and EUR price |
| `get_package` | Show details for one package, with a librepass.co link to buy it |
| `sim_registration_rules` | Look up the local SIM-registration rules LibrePass has checked |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Read-only: no tool places orders. Purchases happen on librepass.co.
- Prices are in EUR and include VAT.

## Docs

- LibrePass: https://librepass.co
- Server URL: https://librepass.co/mcp/

The logo is referenced by URL (`https://librepass.co/brand/logo-512.png`) because librepass.co could not be reached when this plugin was added.

## License

MIT
