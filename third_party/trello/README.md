# Trello

Cursor plugin that connects agents to [Trello](https://trello.com) through Atlassian's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server for Trello.

Browse and create boards, view and move lists, create, update, move, archive, and complete cards with labels and due dates, manage checklists, capture cards in your Inbox, schedule Planner focus time, and search across your workspace.

This is Trello's own MCP server and covers Trello data only. It is separate from Cursor's built-in Atlassian server, which covers Jira and Confluence; install both if you use Trello alongside those products.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Trello**.
3. Click **Install**, then complete the Atlassian sign-in prompt and choose the Trello workspace to authorise.

Or run `/add-plugin trello` in chat.

## MCP

```json
{
  "mcpServers": {
    "trello": {
      "type": "http",
      "url": "https://mcp.trello.com/v1"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Atlassian sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own Atlassian account, picks one Trello workspace on the consent screen, and approves the Read, Write, and Search permissions the connection may use.

## Before you connect

You need a Trello account on any plan. Each connection is scoped to a single Trello workspace at launch; disconnect and reconnect to switch workspaces or to grant a permission you skipped. Creating Planner focus-time events requires Trello Premium or Enterprise, and Inbox and Planner permissions may be unavailable for workspaces outside your own organization. Enterprise admins can allow or block the server and its Read/Write permissions from Atlassian Administration.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Member | `trelloReadMember` returns the signed-in user's profile and defaults, including the timezone used to resolve relative due dates |
| Boards | `trelloReadBoard` gets a board by URL or id, lists boards, and lists boards by workspace with visibility filters and cursor pagination, including the board's labels; `trelloWriteBoard` creates boards |
| Lists | `trelloWriteList` creates lists on a board and moves them, with `pos` for ordered creation |
| Cards | `trelloReadCard` gets a card by URL or id; `trelloWriteCard` creates, updates, moves, archives, and marks cards done, sets due dates, and attaches or detaches labels |
| Checklists | `trelloWriteChecklist` creates and updates checklists on a card and adds or updates checklist items |
| Inbox | `trelloReadInbox` and `trelloWriteInbox` view, create, update, and archive cards in your personal Inbox, which is separate from boards |
| Planner | `trelloReadPlanner` reads calendar events from a connected Google or Outlook calendar; `trelloWritePlanner` creates focus-time events and links or unlinks cards to them |
| Search | `trelloSearch` finds cards and boards by keyword, with qualifiers such as `due:` |

Tools are action-dispatched: each takes an `action` parameter that selects the operation. Every id is an Atlassian Resource Identifier (`ari:cloud:trello::card/workspace/<workspaceId>/<cardId>`) returned by a read tool, not a raw Trello id or short link. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Writes land on real boards that your teammates see. Ask the agent to confirm before bulk moves, archives, or Inbox clean-ups.
- The server has no permanent delete; cards and lists can only be archived.
- Comments, attachments, custom fields, card members, label management, and board editing are not exposed yet. Atlassian lists them as planned in the server's README.
- Due dates and Planner times are UTC ISO 8601; the agent should read the member's timezone first when you give relative times such as "tomorrow at 1pm".

## Docs

- Trello MCP server README: https://github.com/atlassian/trello-mcp-server
- Trello support article: https://support.atlassian.com/trello/docs/connect-trello-to-ai-assistants-with-trello-mcp/
- Agent skill for calling the tools correctly: https://github.com/atlassian/trello-mcp-server/blob/main/skills/trello-use/SKILL.md
- Server URL: https://mcp.trello.com/v1

Logo is Trello's official mark.

## License

MIT
