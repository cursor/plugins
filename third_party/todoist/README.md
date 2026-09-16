# Todoist

Cursor plugin that connects agents to [Todoist](https://www.todoist.com) through Todoist's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create, find, update, and complete tasks, and manage projects, sections, labels, and due dates in the signed-in Todoist account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Todoist**.
3. Click **Install**, then complete the Todoist sign-in prompt.

Or run `/add-plugin todoist` in chat.

## MCP

```json
{
  "mcpServers": {
    "todoist": {
      "type": "http",
      "url": "https://ai.todoist.net/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Todoist sign-in on the first tool call — there is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Tasks | Create, update, complete, and reopen tasks, including due dates and reminders |
| Projects | Manage projects, sections, and labels |
| Search | `search` and `fetch` tools for finding tasks and pulling their details |
| Comments | Read and add comments on tasks and projects |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Todoist user who authorizes the connection.
- Doist also publishes an official local server, `@doist/todoist-mcp`, which authenticates with a `TODOIST_API_KEY`. It is worth switching to if you hit session disconnections on the hosted endpoint.
- No Todoist plan tier is required. The paid-plan requirements in Todoist's help articles apply to the AI client, not to Todoist.

## Docs

- Todoist MCP server: https://github.com/Doist/todoist-mcp
- Use Todoist MCP: https://www.todoist.com/help/articles/use-chatgpt-with-todoist-mcp-WEeLx9d8h
- Server URL: https://ai.todoist.net/mcp

Logo is Todoist's official mark, from the `Doist` GitHub organization.

## License

MIT
