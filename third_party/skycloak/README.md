# Skycloak

Cursor plugin that connects agents to [Skycloak](https://skycloak.io) through Skycloak's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Skycloak is an identity-as-a-service provider built on managed Keycloak. Manage clusters, realms, users, roles, groups, applications, SSO identity providers, custom domains, branding, webhooks, and audit events in plain language.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Skycloak**.
3. Click **Install**, then complete the Skycloak sign-in prompt in your browser.

Or run `/add-plugin skycloak` in chat.

## MCP

```json
{
  "mcpServers": {
    "skycloak": {
      "type": "http",
      "url": "https://mcp.skycloak.io"
    }
  }
}
```

Auth is OAuth browser sign-in, so there is no API key to copy. For read-only access, add `?readonly=true` to the server URL.

## Before you connect

You need a Skycloak account. The free trial at https://skycloak.io includes a full Keycloak cluster for 7 days.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Clusters | List clusters and check their status |
| Realms | Create and manage realms |
| Users and access | Manage users, roles, and groups |
| Applications | Create applications such as OIDC clients and read their client IDs |
| SSO | Configure identity providers |
| Domains and branding | Manage custom domains and login branding |
| Events | Manage webhooks and read audit events |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the permissions of the signed-in Skycloak account.
- Destructive actions need explicit confirmation.

## Docs

- Skycloak MCP: https://skycloak.io/docs/mcp/
- Server URL: https://mcp.skycloak.io

## License

MIT
