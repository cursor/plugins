# Item

Cursor plugin that connects agents to [Item](https://item.app), the AI-native CRM, through Item's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and read contacts, companies, and custom objects; create, update, and delete records; run saved views; manage lists, notes, and tasks; and ask the Item assistant natural-language questions across your CRM, emails, and meetings, all in the signed-in Item workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Item**.
3. Click **Install**, then complete the Item sign-in prompt and allow access.

Or run `/add-plugin item` in chat.

## MCP

```json
{
  "mcpServers": {
    "item": {
      "type": "http",
      "url": "https://mcp.item.app/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE (S256) and Dynamic Client Registration, with the `openid`, `profile`, and `email` scopes. Item's authorization server is its Supabase Auth instance, and the consent page lives at `app.useitem.io`. Cursor registers itself and prompts for Item sign-in when the plugin connects, so there is no API key or client ID to configure. Sign in with the Item account you want Cursor to act as, review the requested access, and allow it.

## What agents can do

| Area | Tools |
| --- | --- |
| Assistant | `ask_item_assistant` |
| Objects & schema | `search_objects`, `get_object`, `get_last_phone_call`, `list_object_types`, `get_object_schema`, `get_workspace_context`, `create_object`, `update_object`, `delete_object` |
| Views | `list_views`, `execute_view` |
| Lists | `list_lists`, `get_list`, `create_list`, `add_to_list`, `remove_from_list` |
| Notes & tasks | `create_note`, `edit_note`, `search_notes`, `search_tasks`, `create_task`, `update_task`, `delete_task` |

The hosted server is the source of truth for tool names and schemas. Item publishes the tool reference at https://docs.item.app/mcp-docs. Tool availability depends on your account permissions and connected integrations.

## Notes

- Your Item account needs active app access under the same billing rules as the web app.
- `ask_item_assistant` runs in read-only mode and is the right tool for analysis, synthesis across object types, emails, meetings, recordings, and timelines. Pass the returned `thread_id` on follow-up calls to continue the conversation.
- Call `list_object_types` and `get_object_schema` before searching or updating so object slugs and field names are valid.
- `create_object`, `update_object`, `delete_object`, and the list, note, and task tools change CRM data. `delete_task` cannot be undone from the assistant UI. Approve these deliberately.
- Item deliberately does not expose external messaging, calendar writes, Slack or LinkedIn sending, credit-spending enrichment, raw SQL, bulk mutations, or skill triggering through MCP.
- Opening `https://mcp.item.app/mcp` in a browser shows a missing-authorization error. That is expected; connect through the plugin instead.
- Revoke access by disconnecting the plugin in Cursor.

## Docs

- Official Item MCP: https://docs.item.app/mcp-docs
- Item API: https://docs.item.app
- Server URL: https://mcp.item.app/mcp

Logo is Item's official app icon, the 256×256 icon published on item.app.

## License

MIT
