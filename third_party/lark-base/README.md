# Lark Base

Cursor plugin that connects agents to [Lark Base](https://www.larksuite.com/product/base) (Bitable) through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read a Base's tables, fields, views, and records, and create or update tables, fields, and records in the signed-in Lark account.

Docs and messages stay on the separate [Lark](../lark/) plugin, which fronts Lark's own MCP server. This plugin talks only to international Lark Suite (`larksuite.com`).

## Install

1. A team admin opens **Cursor Settings → Plugins**, searches for **Lark Base**, and installs it for the team.
2. The admin enters the team's Lark app (see [Team setup](#team-setup)).
3. Each member signs in to Lark when Cursor prompts them.

Or run `/add-plugin lark-base` in chat.

Requires Cursor 3.19.0 or later.

## MCP

```json
{
  "mcpServers": {
    "lark-base": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/lark-base/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

Auth is OAuth. Cursor prompts each member for Lark sign-in under the team's app. Token exchange and refresh run on Cursor's backend. The App Secret is stored encrypted and is never sent to members' machines.

## Team setup

Cursor registers no Lark app. A team admin creates one custom app and enters its credentials once. Every member then signs in to their own Lark account under that app.

### 1. Create a Lark app

In the [Lark developer console](https://open.larksuite.com/app), create a custom app, then:

1. Add the `bitable:app` and `offline_access` permissions.
2. Turn on refreshing user access tokens in the app's security settings. Without that, Lark issues no refresh token and every grant lasts about two hours.
3. Register these redirect URLs:
   - `https://www.cursor.com/agents/mcp/oauth/callback`
   - `http://localhost:8787/callback`
   - `https://www.cursor.com/bot/mcp/oauth/callback`
4. Publish an app version.

### 2. Enter the app in Cursor

Only a team admin can save these. Both fields are required:

| Field | Value |
| --- | --- |
| `CLIENT_ID` | The app's **App ID**. |
| `CLIENT_SECRET` | The app's **App Secret**. Stored encrypted and never shown back on plugin listings. |

### 3. Members sign in

Each member signs in to Lark with their own account. A member can only open a Base that account can already open.

## What agents can do

| Category | Tools |
| --- | --- |
| Read | `get_base`, `list_tables`, `list_fields`, `list_views`, `search_records`, `get_records` |
| Write | `create_records`, `update_records`, `create_table`, `create_field` |
| Destructive | `delete_records` |

`delete_records` cannot be undone through the API. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Pass an `app_token` or a Lark Base link whose path contains `/base/{app_token}` (for example `https://<tenant>.larksuite.com/base/<app_token>`). A wiki link names a wiki node, so the server refuses it.
- Calls run as the signed-in Lark user and cannot exceed that user's Base permissions, or the `bitable:app` scope on the team's app.
- Changing the App ID or App Secret signs members out. They reconnect once.

## Docs

- Lark Base: https://www.larksuite.com/product/base
- Bitable overview: https://open.larksuite.com/document/server-docs/docs/bitable-v1/bitable-overview
- Obtain an OAuth code: https://open.larksuite.com/document/authentication-management/access-token/obtain-oauth-code
- Server URL: https://api.cursor.com/rest-mcp/lark-base/mcp

Logo is Lark's official bird mark, from the `larksuite` GitHub organization (Lark Technologies Pte. Ltd.).

## License

MIT
