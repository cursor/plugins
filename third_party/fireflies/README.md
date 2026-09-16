# Fireflies

Cursor plugin that connects agents to [Fireflies](https://fireflies.ai) through Fireflies's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and retrieve Fireflies meeting transcripts, summaries, action items, and soundbites, and manage meeting sharing and channels.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Fireflies**.
3. Click **Install**, then complete the Fireflies sign-in prompt.

Or run `/add-plugin fireflies` in chat.

## MCP

```json
{
  "mcpServers": {
    "fireflies": {
      "type": "http",
      "url": "https://api.fireflies.ai/mcp"
    }
  }
}
```

Auth is OAuth against your Fireflies, Google, or Microsoft account. Cursor prompts for sign-in when the plugin connects.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Meetings | Search meetings, then fetch transcripts, summaries, and action items |
| Management | Share, revoke, rename, and move meetings |
| Soundbites & channels | Work with soundbites and meeting channels |
| Team | Users and team analytics |
| Automation | Read automation rule execution logs (Enterprise) |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Fireflies user who authorizes the connection.
- Fireflies also accepts an API key sent as `Authorization: Bearer <API_KEY>`, generated under **Settings → Developer Settings**.
- `fireflies_get_rule_executions` requires Enterprise-tier access, and `fireflies_search` / `fireflies_fetch` are experimental and still rolling out.
- Fireflies' Zero-Day Retention policy does not cover data leaving through MCP.
- Fireflies runs a second, separate MCP server for documentation search at `https://docs.fireflies.ai/mcp`. This plugin points at the meetings server.

## Docs

- Fireflies MCP configuration: https://docs.fireflies.ai/getting-started/mcp-configuration
- MCP tools overview: https://docs.fireflies.ai/mcp-tools/overview
- Server URL: https://api.fireflies.ai/mcp

Logo is Fireflies's official mark, from the `firefliesai` GitHub organization.

## License

MIT
