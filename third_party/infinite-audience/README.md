# Infinite Audience

Cursor plugin that connects agents to [Infinite Audience](https://infiniteaudience.ai) through Infinite Audience's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Resolve identities, enrich consumer data, and discover precision audiences for your activation channels.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Infinite Audience**.
3. Click **Install**, then complete the Infinite Audience sign-in prompt.

Or run `/add-plugin infinite-audience` in chat.

## MCP

```json
{
  "mcpServers": {
    "infinite-audience": {
      "type": "http",
      "url": "https://mcp.infiniteaudience.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Infinite Audience sign-in when the plugin connects, and you approve the scopes for your organization.

## Before you connect

You need an Infinite Audience account with access to an organization.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Identity resolution | Connect first-party records (names, addresses, emails, phone numbers) to persistent, deduplicated consumer identities in the Infinite Audience Graph |
| Enrichment | Enrich existing consumer data |
| Discovery | Browse audience fields and discover net-new targets |
| Segments, audiences, and campaigns | List saved segments and audiences, and summarize campaigns and their linked audiences |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Infinite Audience permissions of the user who authorizes the connection.

## Docs

- Infinite Audience: https://infiniteaudience.ai
- Server URL: https://mcp.infiniteaudience.ai/mcp

The logo points at the publisher's hosted image, `https://infiniteaudience.ai/assets/ia-shield.png`. infiniteaudience.ai could not be reached when this plugin was added, so no local copy is committed.

## License

MIT
