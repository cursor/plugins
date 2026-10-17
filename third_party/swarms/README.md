# Swarms

Cursor plugin that connects agents to the [Swarms API](https://swarms.ai) through Swarms' official hosted remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run a single agent, orchestrate a multi-agent swarm across 14 architectures, execute graph and batched-grid workflows, generate an agent roster from a plain-language task, and fan work out in parallel batches — all from chat.

Official Cursor setup: https://docs.swarms.ai/docs/documentation/clients/swarms-api-mcp

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
      "url": "https://mcp.swarms.world/mcp",
      "headers": {
        "x-api-key": "${SWARMS_API_KEY}"
      }
    }
  }
}
```

Auth is a Swarms **API key** sent in an `x-api-key` header. Create one at https://swarms.world/platform/api-keys, then set it in **Dashboard → Plugins → Configure**. Do not commit the key.

## Before you connect

You need a Swarms account and an API key with credits. The server holds no key of its own — it forwards the key on each request to `https://api.swarms.world`, so every call runs against your account and spends your credits. The key travels as a transport header and is never a tool argument, so the model driving the tools never sees it.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Agents | Execute a single agent completion with a full agent spec (model, system prompt, loops, tools, images), run many agent completions in parallel, and list agent configurations you have created |
| Swarms | Execute a multi-agent swarm over `SequentialWorkflow`, `ConcurrentWorkflow`, `HierarchicalSwarm`, `MixtureOfAgents`, `GroupChat`, `MajorityVoting`, `AgentRearrange`, `MultiAgentRouter`, `CouncilAsAJudge`, `LLMCouncil`, `DebateWithJudge`, `HeavySwarm`, `RoundRobin`, or `PlannerWorkerSwarm`; run swarms in parallel batches; list available architectures |
| Specialized workflows | Graph workflows with directed agent nodes and edges, batched grid workflows, reasoning agents with their type list, and an auto agent builder that designs a roster from a task description |
| Models and tools | List available models, list models in OpenAI-compatible shape, OpenAI-compatible chat completions, and list available API tools |
| Account and monitoring | Rate limits and usage, credit balance, pricing details, metrics summary, request logs, premium endpoint availability, and health |

23 tools in total. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions and credits attached to the API key, and are billed the same way the REST API is. Check `credit_balance_v1_account_credits_get` and `usage_costs_v1_usage_costs_get` before long runs.
- Swarm and batch runs can be long and expensive — a swarm accepts up to 2000 agents and 50 loops. Confirm the shape of the run before launching one from chat.
- Some endpoints, including batched grid workflows, are premium-only. `premium_endpoints_v1_account_premium_endpoints_get` returns the current list.
- `tools/list` works without a key, so the tool surface is discoverable before you authenticate; only tool calls need credentials.
- Two tool names are truncated with a stable hash suffix (`..._comple_a8b363`, `..._comple_0dda3b`) because MCP caps tool-name length. Use them exactly as the runtime lists them.
- Tool results carry `structuredContent` alongside the text rendering, so results parse without string handling. Upstream failures come back as `isError: true`, not transport exceptions.
- Revoke access at any time by deleting the key from the Swarms API keys page.

## Docs

- Swarms API MCP server: https://docs.swarms.ai/docs/documentation/clients/swarms-api-mcp
- Documentation home: https://docs.swarms.ai
- Quickstart: https://docs.swarms.ai/docs/documentation/getting-started/quickstart
- Multi-agent architectures: https://docs.swarms.ai/docs/documentation/multi-agent/available-architectures
- Pricing and rate limits: https://docs.swarms.ai/docs/documentation/resources/pricing
- API keys: https://swarms.world/platform/api-keys
- Server URL: https://mcp.swarms.world/mcp

Logo is Swarms' official mark, from the `The-Swarm-Corporation` GitHub organization.

## License

MIT
