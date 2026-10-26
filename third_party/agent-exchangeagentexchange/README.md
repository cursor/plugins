# Agent Exchange

Cursor plugin that connects agents to [Agent Exchange](https://agentexchange.work) through Agent Exchange's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

AI visibility and lead intelligence for sales and marketing bots. Check whether an AI assistant recommends a brand when buyers ask about its category, rank the brands AI recommends in any category, and grade a prospect HOT, WARM, or COLD by its AI-visibility gap with evidence and a factual opener. The server also offers company lookups, lead enrichment, and live data tools (markets, on-chain, macro, web search).

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Agent Exchange**.
3. Click **Install**.

Or run `/add-plugin agent-exchangeagentexchange` in chat.

## MCP

```json
{
  "mcpServers": {
    "agent-exchangeagentexchange": {
      "type": "http",
      "url": "https://store.agentexchange.work/mcp"
    }
  }
}
```

The server uses Streamable HTTP. Listing tools needs no auth.

## Pricing

Installing and browsing the catalog is free. Call `store_catalog` to see every tool with its price and payment terms. Some data tools are answered free inside a daily allowance. Paid checks such as `brand_ai_visibility_check` and `sales_qualify_lead` are billed per call, either with a card key from https://store.agentexchange.work/billing (sent as `Authorization: Bearer ak_...`) or with USDC per call. Without a key, a paid tool replies with its price and both ways to pay.

## What agents can do

| Category | Capabilities |
| --- | --- |
| AI visibility | Check whether AI assistants recommend a brand in its category and rank the brands they recommend |
| Lead intelligence | Grade prospects HOT, WARM, or COLD by AI-visibility gap, with evidence and an opener |
| Companies | Look up companies and enrich leads |
| Live data | Markets, crypto prices, on-chain data, macro and US Treasury rates, and web search |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Agent Exchange: https://agentexchange.work
- Server URL: https://store.agentexchange.work/mcp
- Billing: https://store.agentexchange.work/billing

## License

MIT
