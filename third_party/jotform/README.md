# Jotform

Cursor plugin that connects agents to [Jotform](https://www.jotform.com) through Jotform's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List and create forms, edit existing ones, submit to them, and read submissions in the signed-in Jotform account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Jotform**.
3. Click **Install**, then complete the Jotform sign-in prompt.

Or run `/add-plugin jotform` in chat.

## MCP

```json
{
  "mcpServers": {
    "jotform": {
      "type": "http",
      "url": "https://mcp.jotform.com"
    }
  }
}
```

Auth is OAuth 2.0 and it is required on first connect. Cursor prompts for Jotform sign-in when the plugin connects. Bearer-token access is not supported.

## Before you connect

Only **workspace admins** can install the Jotform MCP app. Once an admin has approved it, every user still authorizes individually. Revoke a client later from **Account → Connected Apps → Jotform MCP → Clients**.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Forms | List forms, create new ones, edit existing ones, and assign them |
| Submissions | Read submissions and create new ones |

The hosted runtime is the source of truth for tool names and schemas. Call `list_forms` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Jotform user who authorizes the connection.
- The server URL is the bare host, `https://mcp.jotform.com`, with no `/mcp` path suffix.
- Free and paid Jotform accounts both work. Enterprise plans get higher rate limits (600 requests per minute), custom branding, and SSO.
- Self-hosting is not offered — the hosted endpoint is the only option.

## Docs

- Jotform MCP: https://www.jotform.com/mcp/
- Developer page: https://www.jotform.com/developers/mcp/
- Server repository: https://github.com/jotform/mcp-server
- Server URL: https://mcp.jotform.com

Logo is Jotform's official mark, from the `jotform` GitHub organization.

## License

MIT
