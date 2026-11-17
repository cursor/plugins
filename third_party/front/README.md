# Front

Cursor plugin that connects agents to [Front](https://front.com) through Front's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search conversations, read full timelines, draft and send replies, post internal comments, and manage tags, tasks, assignments, and inboxes in the signed-in Front account.

## Install

1. A Front admin creates a developer app and notes its credentials (see [Setup](#setup)).
2. Open **Cursor Settings → Plugins**, search for **Front**, and click **Install**.
3. Set **Front Client ID** and **Front Client Secret**, then complete the Front sign-in prompt.

Or run `/add-plugin front` in chat.

## MCP

```json
{
  "mcpServers": {
    "front": {
      "type": "http",
      "url": "https://mcp.frontapp.com/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}",
        "scopes": ["feature:mcp"]
      }
    }
  }
}
```

Front does not support dynamic client registration, so the connection is a confidential client: a Front admin registers one developer app and Cursor sends that app's client ID and secret. Each user still signs in with their own Front account, and tool calls run with that teammate's Front permissions.

## Setup

### 1. Create the Front developer app

In Front, go to **Settings → Company → Developer** and create an app (for example "Cursor MCP Connector"):

1. On the **Features** tab, click **Add feature** and select **Front MCP**.
2. Note the **Client ID** and **Client secret**.
3. Register the redirect URLs Cursor uses:

   | Surface | Redirect URL |
   | --- | --- |
   | Desktop | `http://localhost:8787/callback` |
   | Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
   | Grok Bot | `https://www.cursor.com/bot/mcp/oauth/callback` |

4. Under **Resource permissions**, select the narrowest set that covers your use case: `read` for a research agent, `read` + `write` for a drafting copilot, and `send` only if the agent should actually send messages.
5. Save the app.

### 2. Enter the credentials in Cursor

In **Dashboard → Plugins → Configure**, set **Front Client ID** and **Front Client Secret** from that app. On a team marketplace an admin sets them once for everyone; each member still completes their own Front sign-in.

## What agents can do

| Category | Tools |
| --- | --- |
| Conversations | `search_conversations`, `read_conversation`, `update_conversation_status`, `assign_conversation`, `move_conversation` |
| Drafts and messages | `create_draft`, `update_draft`, `delete_draft`, `send_message`, `list_drafts`, `read_message`, `get_attachment` |
| Comments and tags | `add_comment`, `list_tags`, `tag_conversation` |
| Tasks | `create_task`, `update_task` |
| Templates | `search_message_templates` |
| Contacts and accounts | `search_contacts`, `read_contact`, `search_accounts`, `read_account` |
| Organization | `get_my_identity`, `list_inboxes`, `list_channels`, `list_teammates`, `list_teams`, `list_statuses` |

The hosted runtime is the source of truth for tool names and schemas. Tools that mutate state visibly are marked destructive, so Cursor asks for confirmation per call.

## Notes

- Permissions are enforced at call time against the teammate's current Front role. An inbox that teammate cannot see is invisible to the agent too. `search_conversations` defaults to `my_conversations`; unassigned conversations need `scope: all_inboxes`.
- Changing the app's resource permissions does not reach existing connections. Each user has to disconnect Front and connect again before new permissions, or tools that need them, start working. Until then those tools return `missing required scopes`.
- Task IDs are conversation IDs: `read_conversation` and `search_conversations` (with `filters.type: "task"`) read them, but only `update_task` changes task state.
- Rate limits are metered in tool calls per minute — 100 on Starter, 200 on Professional, 300 on Enterprise — keyed to the connecting teammate and independent of Core API limits. Unpublished apps in a company share one pool, so adding apps divides capacity. Over-limit calls come back as tool results that state how long to wait.

## Docs

- Front MCP server: https://dev.frontapp.com/docs/mcp-server
- Server URL: https://mcp.frontapp.com/mcp
- Authorization URL: https://app.frontapp.com/oauth/authorize
- Token and refresh URL: https://app.frontapp.com/oauth/token

Logo is Front's official app mark, the 192×192 app icon published on front.com.

## License

MIT
