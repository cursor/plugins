# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — Initial release

- Display name "Shopify" (slug `shopify-store`, distinct from Shopify's AI Toolkit plugin).
- `rules/shopify.mdc`: routes store data and changes to the MCP tools (confirm before writes) and developer work to the Shopify AI Toolkit skills; CLI-backed store actions use the MCP inside Grok Bot.
- Grok Bot only (`minClientVersions`: cursor `never`, grokbot and sand `0.49.0`).
- Hosted MCP at `https://setup.shopify.com/mcp`, served through the Grok Shopify connector.
- Listing description states what connecting does, what is shared, that Grok keeps the authorization while privacy mode governs conversation storage and training, that xAI never sees the Shopify password, and that the store can be disconnected from grok.com.
