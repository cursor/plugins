# Basecamp

Cursor plugin that connects agents to [Basecamp](https://basecamp.com) through Basecamp's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server, built and run by 37signals.

Find, read, and update projects, to-dos, cards, messages, comments, documents, schedules, check-ins, and Campfire chats in the signed-in Basecamp account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Basecamp**.
3. Click **Install**, then complete the Basecamp sign-in prompt.

Or run `/add-plugin basecamp` in chat.

## MCP

```json
{
  "mcpServers": {
    "basecamp": {
      "type": "http",
      "url": "https://mcp.basecamp.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.1 with Dynamic Client Registration and PKCE. Cursor registers itself and prompts for Basecamp sign-in when the plugin connects — there is no API key or client ID to configure. On the consent screen you choose the Basecamp account and Read-only or Full access.

## What agents can do

| Category | Capabilities |
| --- | --- |
| My work | Assignments, Hey! notifications, schedule, and what's new across projects |
| To-dos and cards | Create, assign, complete, and move to-dos and Card Table cards |
| Messages and docs | Read and post messages, comments, and documents |
| Schedules, check-ins, and chat | Add schedule entries, read and answer check-ins, and read and post in Campfire |
| Search | `search` across the account and `get_by_url` for any Basecamp link |

Every Basecamp operation is its own tool, annotated read-only, additive (creates) or destructive. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Basecamp person who authorizes the connection, with their permissions.
- Most removals go to the Basecamp trash, where they can be restored. Permanent deletes ask for confirmation where the client supports it.
- Disconnect any time from **Connected apps** in your Basecamp profile menu.

## Docs

- Basecamp and AI assistants: https://basecamp.com/ai
- Server URL: https://mcp.basecamp.com/mcp
- Basecamp CLI and agent skill: https://github.com/basecamp/basecamp-cli

Logo is Basecamp's official mark (https://basecamp.com/brand/basecamp-logo-white-plate.png).

## License

MIT. The Basecamp name and logo are trademarks of 37signals, LLC and aren't licensed under it.
