# Swarms

Cursor plugin that connects agents to the [Swarms Marketplace](https://swarms.world) through its hosted remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search the marketplace for agents, prompts, and tools, read a listing's full source, publish and edit your own listings, leave reviews, check your account and credits, and run agent or swarm completions — all from chat.

Developer docs: https://swarms.world/developers

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Swarms**.
3. Click **Install**, then set your Swarms API key (below).

Or run `/add-plugin swarms` in chat.

## MCP

```json
{
  "mcpServers": {
    "swarms": {
      "type": "http",
      "url": "https://swarms.world/mcp",
      "headers": {
        "Authorization": "Bearer ${SWARMS_API_KEY}"
      }
    }
  }
}
```

Auth is a Swarms **API key** sent as a Bearer token. Create one at https://swarms.world/platform/api-keys, then set it in **Dashboard → Plugins → Configure**. Do not commit the key.

## Before you connect

You need a Swarms account and an API key. Every tool call runs as the account that owns the key: publishing, editing, and reviewing act on your listings, and completions spend your credits. The key travels as a transport header and is never a tool argument.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Discover | Search agents, prompts, tools, and bundles; list and filter each type; fetch one listing, including the full source of agents and prompts you have access to; query by owner username or name; read reviews; list tokenized products |
| Publish and edit | Publish an agent, prompt, tool, or bundle (or any of them through one `post_v1_publish_product` call), edit agents and prompts you own, attach a launched token address, and submit a 1–5 star review |
| Your account | `get_me` for your user ID, username, credit balance, and listing counts; list your products; count your agents and prompts; check claimable creator fees on your tokenized products |
| Run | Agent completions, multi-agent swarm completions, and Swarms chat, billed to your credits |

The server generates one tool per operation of `https://swarms.world/openapi.json`, so the tool list follows the API — 35 tools at the time of writing. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- `initialize` and `tools/list` work without a key, so the tool surface is discoverable before you authenticate; `tools/call` without a key returns JSON-RPC error `-32001` with a link to the API keys page.
- Write tools (`post_add-*`, `post_edit-*`, `post_v1_publish_*`, `post_reviews`) create or change public listings under your account. Confirm the payload before publishing from chat.
- `post_product_claimfees` takes the token's fee-wallet private key as a tool argument, so the key passes through the model's context. Prefer claiming fees outside chat.
- The server is stateless (no `Mcp-Session-Id`) and shares the marketplace API rate limit of 300 requests per minute per IP.
- Revoke access at any time by deleting the key from the Swarms API keys page.

## Docs

- Developers: https://swarms.world/developers
- MCP skill reference: https://swarms.world/mcp-skill.md
- REST API reference: https://swarms.world/skill.md
- OpenAPI spec: https://swarms.world/openapi.json
- API keys: https://swarms.world/platform/api-keys
- Server URL: https://swarms.world/mcp

Logo is Swarms' official mark, as served at https://swarms.world/swarms-logo.svg.

## License

MIT
