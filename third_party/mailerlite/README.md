# MailerLite

Cursor plugin that connects agents to [MailerLite](https://www.mailerlite.com) through MailerLite's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Add and update subscribers, organize groups and segments, build and inspect campaigns, and manage forms, automations, and webhooks in the signed-in MailerLite account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **MailerLite**.
3. Click **Install**, then complete the MailerLite sign-in prompt.

Or run `/add-plugin mailerlite` in chat.

## MCP

```json
{
  "mcpServers": {
    "mailerlite": {
      "type": "http",
      "url": "https://mcp.mailerlite.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for MailerLite sign-in when the plugin connects — there is no API key or token to paste.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Subscribers | Add and update subscribers, read activity, and count the audience |
| Groups & segments | Create groups, manage membership, and query segments |
| Campaigns | Create, update, schedule, and inspect campaigns and their recipients |
| Forms & automations | Manage forms, create automations, and read automation activity |
| Webhooks & imports | Manage webhooks and run subscriber imports |

The hosted runtime is the source of truth for tool names and schemas. Call `get_subscriber_count` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the MailerLite user who authorizes the connection.
- The MCP server is in beta, so the tool catalog can change.
- The server exposes close to 40 tools. MailerLite notes that Cursor's free plan caps a single connector at 40 active tools, so you may see an "Exceeding total tools limit" warning there.

## Docs

- MailerLite MCP server: https://developers.mailerlite.com/mcp
- How to connect MailerLite's MCP: https://www.mailerlite.com/help/how-to-connect-mailerlites-mcp
- Server URL: https://mcp.mailerlite.com/mcp

Logo is MailerLite's official mark, from the `mailerlite` GitHub organization.

## License

MIT
