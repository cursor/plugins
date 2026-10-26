# DataDoe

Cursor plugin that connects agents to [DataDoe](https://www.datadoe.com) through DataDoe's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

DataDoe is the Amazon data and action layer for AI agents. It gives agents live access to a seller's own Amazon Seller Central, Vendor Central, and Amazon Ads data in one schema: sales, orders, inventory, ads, fees, and settlements. Agents can analyze that data, then act on it: update listings, manage orders, and run Amazon Ads campaigns.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **DataDoe**.
3. Click **Install**, then complete the DataDoe sign-in prompt.

Or run `/add-plugin datadoe` in chat.

## MCP

```json
{
  "mcpServers": {
    "datadoe": {
      "type": "http",
      "url": "https://mcp.datadoe.com/mcp/v1"
    }
  }
}
```

Auth is OAuth: Cursor prompts for DataDoe sign-in when the plugin connects, so there is no API key to configure.

## Before you connect

You need a DataDoe account with at least one Amazon Seller Central, Vendor Central, or Amazon Ads account connected. DataDoe costs $97/month and has a 14-day free trial.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Sales and orders | Units, revenue, and order details by ASIN, SKU, and marketplace |
| Inventory and listings | Inventory levels, listing details, and listing updates |
| Amazon Ads | Campaign performance (spend, ACoS, ROAS) and campaign management |
| Finance | Fees and settlements |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Write Actions (listing updates, order changes, Amazon Ads changes) are off until the user enables them in DataDoe. Actions support a dry run, and every change is logged.
- Tool calls run under the Amazon accounts the authorizing DataDoe user has connected.

## Docs

- DataDoe: https://www.datadoe.com
- Setup guide: https://www.datadoe.com/hub/docs
- Server URL: https://mcp.datadoe.com/mcp/v1

Logo is DataDoe's deer icon from the `Deltologic/datadoe-mcp` GitHub repository (`assets/datadoe-logo-400.png`). The submitted logo URL and datadoe.com could not be reached when this plugin was added.

## License

MIT
