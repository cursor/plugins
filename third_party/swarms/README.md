# Swarms

Cursor plugin that connects agents to the [Swarms Marketplace](https://swarms.world) through Swarms' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, publish, and run agents, prompts, and tools on the Swarms Marketplace.

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

You need a Swarms account and an API key. Anyone can list the tools without a key, but every tool call needs one and runs as the account that owns the key.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Discover | Search and fetch agents, prompts, MCP servers, skills, and tools across 6,600+ marketplace listings |
| Publish | Publish and edit your own listings, and leave reviews |
| Account | Check account details, credit balance, and listing counts |
| Run | Run agents and multi-agent swarms, billed to your Swarms credits |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the account that owns the API key, and runs consume that account's credits.
- Do not paste private keys (for example, token fee-wallet keys) into chat. Handle those outside the agent.

## Docs

- Swarms: https://swarms.ai
- Marketplace: https://swarms.world
- API keys: https://swarms.world/platform/api-keys
- Server URL: https://swarms.world/mcp

Logo is Swarms' hexagon mark from The Swarm Corporation GitHub organization avatar (256×256). swarms.world and swarms.ai blocked automated requests when this plugin was added, so the submitted logo (https://swarms.world/swarms-logo.svg) was not downloaded.

## License

MIT
