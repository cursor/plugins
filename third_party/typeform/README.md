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

This plugin points at `https://api.typeform.com/mcp`, which serves Typeform's default data center. EU-hosted accounts use a different URL, and the two EU hosts are **not** interchangeable:

| Account | Server URL | Authorization server |
| --- | --- | --- |
| Default data center | `https://api.typeform.com/mcp` | `https://api.typeform.com` |
| EU data center | `https://api.eu.typeform.com/mcp` | `https://api.typeform.com` |
| `typeform.eu` | `https://api.typeform.eu/mcp` | `https://api.typeform.eu` |

`api.typeform.eu` is a separate stack with its own issuer, token endpoint, and JWKS, so tokens are not portable between it and `api.typeform.com`. Picking the wrong host fails during the OAuth exchange rather than at install time, which makes it awkward to diagnose.

If you're not sure which applies, the standard discovery chain settles it: an unauthenticated call to the server returns `401` with a `WWW-Authenticate: Bearer resource_metadata="..."` header, and that metadata document names the authorization server to use.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Forms | List, read, create, and edit forms, publish drafts, and check form capabilities |
| Themes | List the themes available to the user and apply one to a form |
| Automations | Read and build automations that react to form submissions |
| Insights | Discover and analyze response data |
| Contacts | List contacts and import form responses by mapping |
| Workspaces & accounts | List workspaces and accounts |

The hosted runtime is the source of truth for tool names and schemas. Call `accounts-list_accounts` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Typeform user who authorizes the connection. The server's authorization challenge advertises `accounts:read`, `automations:read`, `automations:write`, `contacts:read`, `contacts:write`, `forms:read`, `forms:write`, `insights:read`, `responses:read`, `responses:write`, `webhooks:read`, `webhooks:write`, `workspaces:read`, and `workspaces:write`.
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
