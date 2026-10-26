# FlowBeacon AI

Cursor plugin that connects agents to [FlowBeacon AI](https://flowbeacon.ai/) through FlowBeacon's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Governance and security checks for AI agents and automations. Evaluate agents and automations, inspect governance policies, check runtime inputs and outputs for security risks, and get plain-language explanations of policy violations.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FlowBeacon AI**.
3. Click **Install**.

Or run `/add-plugin flowbeacon-ai` in chat.

## MCP

```json
{
  "mcpServers": {
    "flowbeacon-ai": {
      "type": "http",
      "url": "https://mcp.flowbeacon.ai/mcp"
    }
  }
}
```

The server uses Streamable HTTP and authenticates with a FlowBeacon API key sent as `Authorization: Bearer <YOUR_API_KEY>`.

## Before you connect

Sign up for free API access and generate an API key at https://app.flowbeacon.ai/auth/signin?callbackUrl=%2Fapi-keys.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Health | Confirm API connectivity (`check_health`) |
| Policies | List the governance policy catalog (`list_policies`) |
| Evaluation | Score automation blueprints, such as exported Make.com scenarios, against policies (`evaluate_blueprint_inline`) |
| Violations | Get plain-language explanations of policy violations (`explain_violation`) |
| Runtime checks | Check runtime inputs and outputs for security risks |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- FlowBeacon AI: https://flowbeacon.ai/
- Server URL: https://mcp.flowbeacon.ai/mcp

The logo points at FlowBeacon's hosted SVG (`https://flowbeacon.ai/logos/logo_light.svg`). flowbeacon.ai was unreachable when this plugin was added, so no local copy was committed.

## License

MIT
