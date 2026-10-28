# Fiest Business

Cursor plugin that connects agents to [Fiest](https://fiest.io) through Fiest's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Fiest Business connects restaurant owners, managers, and staff to their Fiest account. Review sales, accounting summaries, orders, stock, receipts, menus, and opening hours. Prepare operational changes and apply them through Fiest's approval workflows.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Fiest Business**.
3. Click **Install**, then sign in to Fiest and select your restaurant.

Or run `/add-plugin fiest` in chat.

## MCP

```json
{
  "mcpServers": {
    "fiest": {
      "type": "http",
      "url": "https://mcp.fiest.io/mcp"
    }
  }
}
```

Cursor prompts for Fiest sign-in when the plugin connects.

## Notes

- Access follows the signed-in user's Fiest permissions and enabled features.
- Campaign and Surplus proposals require approval in Fiest Dashboard.
- Payment corrections update recorded allocations; they do not charge customers, issue refunds, or transfer money.
- The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Fiest MCP docs: https://docs.fiest.io/mcp
- Server URL: https://mcp.fiest.io/mcp
- Privacy: https://fiest.io/en/privacy-policy
- Terms: https://fiest.io/en/terms-of-service

Logo is the Fiest wordmark avatar from the `fiestoy` GitHub account. The submitted logo URL (https://mcp.fiest.io/brand/fiest-avatar.png) and fiest.io could not be reached when this plugin was added.

## License

MIT
