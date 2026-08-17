# Juicebox

Cursor plugin that connects agents to [Juicebox](https://juicebox.ai) through Juicebox's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query recruiting analytics, search project shortlists, look up projects, and create or manage sourcing agents in the signed-in Juicebox workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Juicebox**.
3. Click **Install**, then complete the Juicebox sign-in prompt.

Or run `/add-plugin juicebox` in chat.

## MCP

```json
{
  "mcpServers": {
    "juicebox": {
      "type": "http",
      "url": "https://mcp.juicebox.ai/v1"
    }
  }
}
```

Auth is OAuth 2.0 against Juicebox with Dynamic Client Registration (DCR). Cursor registers itself and prompts for Juicebox sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

The Juicebox MCP server is available on all Juicebox paid plans.

During setup you'll see an approval screen listing the permissions the MCP server requests: reading recruiting analytics and creating or calibrating agents. Approve to continue.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Analytics | Catalog available tables and fields (`get_schema`), run read-only reports (`get_data`), and resolve names or links to internal IDs |
| Shortlists | List candidates saved to a project's shortlist, then pull richer details such as years of experience and tenure |
| Projects | Summarize a project, including saved-search and shortlist counts |
| Agents | Create or calibrate sourcing agents, start sourcing, and pause, resume, close, or reopen an agent |

Call `get_schema` before analytics queries, and `get_agent_schema` before creating an agent. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Juicebox user who authorizes the connection and cannot exceed that user's permissions. A user cannot query projects, searches, or candidates they do not already have access to in Juicebox.
- Analytics and shortlist tools are read-only. Agent tools can create, start, pause, resume, close, or reopen sourcing agents in the signed-in workspace.
- Full candidate profiles (experience history and contact details) exported through the MCP server count toward the plan's monthly export limit. Lightweight lookups such as a candidate's name or LinkedIn URL do not.

## Docs

- Juicebox MCP: https://docs.juicebox.ai/juicebox-mcp
- Server URL: https://mcp.juicebox.ai/v1

Logo is Juicebox's official apple-touch icon (white juice-box isotype on the brand purple tile) from https://juicebox.ai.

## License

MIT
