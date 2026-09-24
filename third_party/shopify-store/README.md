# Shopify

Grok Bot plugin that connects agents to the Grok **Shopify** connector, which talks to your store through Shopify's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Connect your Shopify store so Grok can answer questions about your products, orders, customers, inventory, and sales. You sign in with Shopify and approve the store access Grok requests; Grok keeps that authorization so the connector can work, and Grok Bot's privacy mode still controls whether your conversations are stored or used for training. xAI never sees or stores your Shopify password, and you can disconnect the store anytime from grok.com.

This is the merchant connector for an existing store, listed under the slug `shopify-store` because the marketplace already has Shopify's own [`shopify-plugin`](https://cursor.com/marketplace/shopify) (the Shopify AI Toolkit: skills for building on Shopify, no store access). The two are meant to converge into a single "Shopify" plugin that carries both the MCP server and the toolkit skills; until then, `rules/shopify.mdc` tells the agent when to use the store's MCP tools and when to use the toolkit skills if both are installed.

## Who can use it

- Grok Bot **0.49** or newer.
- Not available in Cursor. Cursor must not list or install this plugin.

## MCP

```json
{
  "mcpServers": {
    "shopify": {
      "type": "http",
      "url": "https://setup.shopify.com/mcp"
    }
  }
}
```

The server is Shopify's hosted MCP for a connected store. Sign-in runs through Grok: the Grok connector completes Shopify's OAuth (PKCE public client, registered by xAI) and executes tools on the caller's behalf, so the row appears in Grok Bot as served by Grok. Shopify's authorization server does not offer dynamic client registration, which is why Cursor cannot connect to this URL on its own and the plugin is Grok Bot only.

## Routing rule

`rules/shopify.mdc` (always applied) routes requests: the user's own store data and changes go to the `shopify` MCP tools, with confirmation before any write tool; developer work (GraphQL, Liquid, Functions, Hydrogen, Polaris, App Store review, docs) goes to the Shopify AI Toolkit skills when installed; anything the toolkit would run against a store through the Shopify CLI uses the MCP tools instead inside Grok Bot.

## About this connector

- **Ask about your store in chat.** Products, prices, orders, customers, inventory levels, and sales questions against the connected store.
- **What you share.** Signing in grants Grok the Shopify access you approve on Shopify's consent screen for that store.
- **Authorization.** Grok stores the resulting authorization so the connector can run requests; Grok Bot's privacy mode still controls whether conversations are stored or used for training.
- **Your credentials stay private.** xAI never sees or stores your Shopify password.
- **Disconnect anytime.** Remove the store from the Shopify connector on grok.com.

Third-party connectors are not built or maintained by xAI. Use caution when granting access to external services. Review the permissions before connecting. Usage is subject to the [xAI Privacy Policy](https://x.ai/legal/privacy-policy).

## License

MIT
