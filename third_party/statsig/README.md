# Statsig

Cursor plugin that connects agents to [Statsig](https://statsig.com) through Statsig's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Look up feature gates, experiments, dynamic configs, and metrics in the signed-in Statsig project, read experiment results, and create or update configs when your Statsig role allows writes.

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
      "url": "https://api.statsig.com/v1/mcp"
    }
  }
}
```

Auth is OAuth against Statsig. Cursor prompts for Statsig user login when the plugin connects — there is no API key or client ID to configure.

## Before you connect

- You need a Statsig account with access to a project.
- Statsig MCP OAuth only supports **Personal Console API Keys**. Your Statsig org owner must enable Personal Console API Key creation for your role under organization settings before the OAuth sign-in will succeed.
- Read-only Statsig users can use all read tools. Write tools require a role with write permissions on the project.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Feature gates | List, inspect, create, and update gates and their rules |
| Experiments | List and inspect experiments, read setup and results, create and update experiments |
| Dynamic configs | List, inspect, create, and update dynamic configs |
| Metrics | Look up metrics and metric definitions used by gates and experiments |
| Project | Inspect the signed-in project's configuration |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Statsig user who authorizes the connection and cannot exceed that user's project role.
- Statsig hosts the server itself; this plugin does not wrap a local stdio server or `mcp-remote`.
- Statsig also documents an API-key setup via `npx mcp-remote` with a Console API key header. This plugin uses the OAuth setup only.
- Revoke access at any time by deleting the Personal Console API Key from your Statsig account settings.

## Docs

- Statsig MCP with Cursor: https://docs.statsig.com/integrations/mcp/cursor
- Statsig MCP overview: https://docs.statsig.com/integrations/mcp/overview
- Server URL: https://api.statsig.com/v1/mcp

Logo is Statsig's official mark, from the `statsig-io` GitHub organization.

## License

MIT
