# Typeform

Cursor plugin that connects agents to [Typeform](https://www.typeform.com) through Typeform's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create and edit forms, explore response insights, and manage contacts and workspaces in the signed-in Typeform account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Typeform**.
3. Click **Install**, then complete the Typeform sign-in prompt.

Or run `/add-plugin typeform` in chat.

## MCP

```json
{
  "mcpServers": {
    "typeform": {
      "type": "http",
      "url": "https://api.typeform.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Typeform sign-in when the plugin connects. Personal access tokens are explicitly rejected by the MCP server, so OAuth is the only path.

## Before you connect

This plugin points at Typeform's default data center. If your account is hosted in the EU, change the server URL to `https://api.eu.typeform.com/mcp` or `https://api.typeform.eu/mcp` depending on where your account lives.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Forms | List, read, and create forms, and check form capabilities |
| Insights | Discover and analyze response data |
| Contacts | List contacts and import form responses by mapping |
| Workspaces & accounts | List workspaces and accounts |

The hosted runtime is the source of truth for tool names and schemas. Call `accounts-list_accounts` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Typeform user who authorizes the connection. Scopes requested include `accounts:read`, `forms:read`, `forms:write`, `contacts:read`, `contacts:write`, `insights:read`, and `workspaces:read`.
- Typeform describes this as a generally available beta with limited capabilities, so the tool catalog can change.
- Streamable HTTP is the only supported transport — there is no SSE endpoint.
- If the connection shows no tools right after authorizing, refresh the tool list; Typeform documents this as a known issue.

## Docs

- Typeform MCP server: https://developers.typeform.com/developers/get-started/mcp/
- Connect Typeform to your AI: https://help.typeform.com/hc/en-us/articles/50533862636308-Connect-Typeform-to-your-AI-with-the-Typeform-MCP-server
- Server URL: https://api.typeform.com/mcp

Logo is Typeform's official mark, from the `Typeform` GitHub organization.

## License

MIT
