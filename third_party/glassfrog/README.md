# GlassFrog

Cursor plugin that connects agents to [GlassFrog](https://www.glassfrog.com), the platform for Holacracy and role-based organizations, through GlassFrog's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read and update GlassFrog roles and accountabilities, projects and next actions, policies, tensions, and role channels.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **GlassFrog**.
3. Click **Install**, then complete the GlassFrog sign-in prompt.

Or run `/add-plugin glassfrog` in chat.

## MCP

```json
{
  "mcpServers": {
    "glassfrog": {
      "type": "http",
      "url": "https://app.glassfrog.com/api/v5/mcp/core"
    }
  }
}
```

Auth is OAuth 2.0 with dynamic client registration, so Cursor prompts for GlassFrog sign-in when the plugin connects — there is no client ID or API key to configure. On the approval screen, pick the organization to work in and the permissions to grant (usually **Everything I can access**), then click **Approve**.

## Before you connect

- Your GlassFrog organization needs **AI Integration** turned on. An organization admin turns it on in the organization settings; otherwise the organization is not listed when you connect.
- You need a GlassFrog account in that organization.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Roles | Look up roles, purpose, accountabilities, domains, and who fills them |
| Work | List, create, and update projects and next actions |
| Governance | Read policies and organization rules; raise tensions on roles |
| Communication | Read and post to role channels; read and write role notes |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The connector acts with the access of the account that connects it, sees and changes only what that account can, and every change is attributed to it.
- To disconnect, revoke the app in GlassFrog under your profile → **API** → **Connected apps**.

## Docs

- GlassFrog: https://www.glassfrog.com
- MCP server docs: https://github.com/GlassFrog/glassfrog-mcp
- Server URL: https://app.glassfrog.com/api/v5/mcp/core

Logo is GlassFrog's frog mark from the `GlassFrog` GitHub organization. The submitted logo URL and glassfrog.com were unreachable when this plugin was added, so the file was not downloaded from the website.

## License

MIT
