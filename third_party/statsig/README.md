# Statsig

Cursor plugin that connects agents to [Statsig](https://www.statsig.com) through Statsig's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List and inspect feature gates, experiments, dynamic configs, and metrics in the signed-in Statsig project, pull gate and experiment results, and (with write permissions) create or update gates, experiments, and configs from chat.

Official Cursor setup: https://docs.statsig.com/integrations/mcp/cursor

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Statsig**.
3. Click **Install**, then complete the Statsig sign-in prompt.

Or run `/add-plugin statsig` in chat.

## MCP

```json
{
  "mcpServers": {
    "statsig": {
      "type": "http",
      "url": "https://api.statsig.com/v3/mcp"
    }
  }
}
```

Auth is OAuth against Statsig. Cursor prompts for Statsig user login when the plugin connects — there is no API key or client ID to configure.

## Upgrading from 1.x

Version 2.0.0 connects to MCP v3, which changes the tool names and input schemas. After updating the plugin, reconnect the Statsig server and start a new chat so the agent loads the current tool catalog. Complete the Statsig sign-in prompt if Cursor requests authorization again.

Existing manually configured MCP connections are not changed by this plugin update. If you also configured Statsig manually, update that connection separately and avoid enabling duplicate Statsig connections. Instructions or automations that hardcode legacy tool names must be updated to the tools advertised by v3.

## Before you connect

You need a Statsig account with access to a project. Statsig's MCP OAuth issues a **Personal Console API Key** scoped to your role, so your Statsig org owner must have enabled Personal Console API Key creation for your role under organization settings. If sign-in fails, ask your org owner to enable it.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Gates (feature flags) | List gates with type filters (for example stale or permanent), get full gate configuration, pull gate results, view version history, and create or replace gates |
| Experiments | List experiments by status, creator, or tag; get experiment details; pull overall and dimension results with CUPED and confidence options; view version history; start code cleanup; create or replace experiments |
| Dynamic configs | List configs, get targeting rules and return values, and create or replace configs |
| Metrics | List metrics and metric sources and read metric definitions |

The hosted runtime is the source of truth for tool names and schemas. MCP v3 consolidates related actions into typed tools. Use the tools advertised by the connected server; if a capability is not visible, use `discover_tools` to find the operation and its current input schema.

## Notes

- Tool calls run as the Statsig user who authorizes the connection and cannot exceed that user's role permissions. Read-only roles can use every read tool; write tools require a role with write access.
- For operations that replace an entity, read the current entity first and preserve fields that should remain unchanged. Confirm the intended change before writing and follow any review or acknowledgement requirements returned by the server.
- Statsig also documents an API-key setup that runs `npx mcp-remote` locally with a `statsig-api-key` header. This plugin intentionally packages only the OAuth Streamable HTTP endpoint and does not wrap a local stdio server.
- Revoke access at any time by deleting the Personal Console API Key from your Statsig project's API keys page.

## Docs

- Statsig MCP in Cursor: https://docs.statsig.com/integrations/mcp/cursor
- Statsig MCP overview and tool list: https://docs.statsig.com/integrations/mcp/overview
- Personal Console API Keys: https://docs.statsig.com/access-management/api-keys
- Server URL: https://api.statsig.com/v3/mcp

Logo is Statsig's official mark, from the `statsig-io` GitHub organization.

## License

MIT
