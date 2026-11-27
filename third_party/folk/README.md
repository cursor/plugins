# folk

Cursor plugin that connects agents to [folk](https://www.folk.app), the relationship CRM, through folk's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and update people, companies, deals and other custom objects; log notes, tasks, and interactions; manage groups, custom fields, and views; enrich contacts' emails and phones; and draft, review, and launch email campaigns in the signed-in folk workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **folk**.
3. Click **Install**, then complete the folk sign-in prompt and authorize access to your workspace.

Or run `/add-plugin folk` in chat.

In Grok Bot, open **Settings → Plugins**, install **folk**, and complete the same folk sign-in.

## MCP

```json
{
  "mcpServers": {
    "folk": {
      "type": "http",
      "url": "https://mcp.folk.app/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE (S256) and Dynamic Client Registration against folk's authorization server at `api.stytch.folk.app`; the sign-in and consent page is on `app.folk.app`. Cursor registers itself and prompts for folk sign-in when the plugin connects, so there is no API key or client ID to configure. Each user signs in with their own folk account, and the connection has the same access as that user in the workspace.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## Before you connect

You need a folk account with access to a workspace. What the agent can read and change follows your folk user's access, including your role in each group. Some tools also depend on your plan and workspace setup: enrichment spends workspace credits, multi-step campaigns need sequences on the plan, and campaigns send from the email senders connected to your account.

## What agents can do

| Area | Read | Write |
| --- | --- | --- |
| Workspace | `folk_get_current_user`, `folk_get_workspace_structure`, `folk_get_credits` | — |
| People | `folk_search_people`, `folk_get_person` | `folk_create_people`, `folk_update_people` |
| Companies | `folk_search_companies`, `folk_get_company` | `folk_create_companies`, `folk_update_companies` |
| Deals & custom objects | `folk_search_objects`, `folk_get_object` | `folk_create_objects`, `folk_update_objects` |
| Enrichment | `folk_get_person_enrichment`, `folk_list_person_enrichments` | `folk_enrich_people` |
| Notes | `folk_search_notes` | `folk_create_note`, `folk_update_note` |
| Interactions | `folk_list_interactions`, `folk_get_interaction` | `folk_create_interaction`, `folk_update_interaction` |
| Tasks | `folk_search_tasks`, `folk_get_task` | `folk_create_task`, `folk_update_task`, `folk_update_task_todo_or_done` |
| Groups & members | `folk_list_groups`, `folk_list_group_members` | `folk_create_group`, `folk_update_group`, `folk_add_group_member`, `folk_update_group_member_role`, `folk_remove_group_member` |
| Custom fields | `folk_list_group_custom_fields`, `folk_get_group_custom_field` | `folk_create_group_custom_field`, `folk_update_group_custom_field` |
| Views | `folk_list_views`, `folk_get_view` | `folk_create_view`, `folk_update_view` |
| Campaigns | `folk_list_campaigns`, `folk_get_campaign`, `folk_list_campaign_messages`, `folk_list_campaign_variables`, `folk_list_message_senders` | `folk_create_campaign`, `folk_update_campaign`, `folk_update_campaign_messages`, `folk_review_campaign`, `folk_draft_campaign`, `folk_remove_campaign_recipient`, `folk_launch_campaign`, `folk_cancel_campaign_schedule`, `folk_stop_campaign`, `folk_delete_campaign` |

folk listed 60 current tools at the time of writing, plus 6 deprecated single-record tools (`folk_create_person`, `folk_update_person`, `folk_create_company`, `folk_update_company`, `folk_create_object`, `folk_update_object`) that keep working until April 16, 2027. The hosted server is the source of truth for tool names and schemas; see [Supported tools](https://developer.folk.app/mcp/tools) for the current list. Call `folk_get_current_user` as a read-only smoke test after connecting; it returns the folk user for the connection.

## Notes

- Have the agent call `folk_get_workspace_structure` at the start of a session. It returns the groups, fields, pipelines, and members the other tools need. Deals, opportunities, and projects are custom object types whose names differ between workspaces.
- `folk_create_campaign` with target `launch` and `folk_launch_campaign` send real emails that cannot be unsent. folk's tool descriptions tell the agent to show the campaign and get your explicit approval first; confirm the recipients, steps, sender, and send time before approving. `folk_stop_campaign` and `folk_delete_campaign` cannot be undone.
- `folk_enrich_people` sends people's data to third-party providers and spends `person_enrichment` credits: 1 per person for emails and 4 for phones, refunded for fields not found. Check `folk_get_credits` before a large enrichment.
- People, companies, objects, notes, and other records cannot be deleted through the folk MCP. Only draft and in-review campaigns can be deleted.
- Interaction content can be hidden by the workspace's interaction privacy rules.
- Revoke access by disconnecting the plugin in Cursor.

## Docs

- folk MCP overview: https://developer.folk.app/mcp/overview
- Connecting to folk MCP: https://developer.folk.app/mcp/connect
- Supported tools: https://developer.folk.app/mcp/tools
- Security best practices: https://developer.folk.app/mcp/security-best-practices
- Server URL: https://mcp.folk.app/mcp

Logo is folk's official smiley mark, the icon published on folk.app.

## License

MIT
