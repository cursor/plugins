# Enginy

Cursor plugin that connects agents to [Enginy](https://enginy.ai) through Enginy's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find and enrich B2B prospects, manage contacts, companies, and lists, prepare campaigns, review outreach analytics, and work with LinkedIn social selling.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Enginy**.
3. Click **Install**, then complete the Enginy sign-in prompt.

Or run `/add-plugin enginy` in chat.

## MCP

```json
{
  "mcpServers": {
    "enginy": {
      "type": "http",
      "url": "https://openapi.enginy.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Enginy sign-in when the plugin connects — there is no API key to configure.

## Before you connect

You need an Enginy account with MCP enabled in your workspace. Existing plan and credit limits apply, and tool calls respect Enginy workspace permissions.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Prospecting | Find and enrich prospects |
| CRM data | Manage contacts, companies, and lists |
| Outreach | Prepare campaigns and review outreach analytics |
| Social selling | Work with LinkedIn social selling |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Enrichment and outreach actions can consume Enginy credits or contact real prospects. Review those calls before approving them.

## Docs

- Enginy: https://enginy.ai
- Cursor setup: https://docs.enginy.ai/mcp/cursor
- Server URL: https://openapi.enginy.ai/mcp

Logo is Enginy's favicon (`https://docs.enginy.ai/favicon.svg`), taken from the source of Enginy's docs site in the `Genesy-AI` GitHub organization. docs.enginy.ai could not be reached when this plugin was added.

## License

MIT
