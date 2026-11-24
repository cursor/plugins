# Jobber

Cursor plugin that connects agents to [Jobber](https://www.getjobber.com) through Jobber's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Look up a home or commercial service business's clients, properties, requests, quotes, jobs, visits, and invoices, and turn notes, emails, or call summaries into new clients, properties, requests, and quotes — within your own Jobber permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Jobber**.
3. Click **Install**, then set the client ID and secret (below) and complete the Jobber sign-in prompt.

Or run `/add-plugin jobber` in chat.

## MCP

```json
{
  "mcpServers": {
    "jobber": {
      "type": "http",
      "url": "https://mcp.getjobber.com/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

## Setup

Jobber's authorization server (`api.getjobber.com`) does not support Dynamic Client Registration, so an OAuth app has to exist before anyone can connect.

1. Sign in to the [Jobber Developer Center](https://developer.getjobber.com/) and create an app.
2. Register both callback URLs on that app:
   - Desktop: `http://localhost:8787/callback`
   - Web and Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
3. In **Dashboard → Plugins → Configure**, set **Jobber Client ID** and **Jobber Client Secret** from that app.
4. Complete the Jobber OAuth login when Cursor prompts and select **Allow Access**.

On a team marketplace an admin sets the client ID and secret once for everyone; each member still completes their own Jobber OAuth login, so tool calls run with that member's Jobber permissions.

## Before you connect

The connector is available on Jobber's Core, Connect, Grow, and Plus plans.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Look up | Search and read clients, properties, requests, quotes, jobs, visits, and invoices |
| Create and edit | Clients, properties, and requests |
| Create only | Quotes, with a total, deposit, and discount (no unit costs or margins); they can't be edited afterward |

The server is the source of truth for tool names and schemas. The OAuth scopes it advertises are `mcp:read_clients`, `mcp:write_clients`, `mcp:read_requests`, `mcp:write_requests`, `mcp:read_quotes`, `mcp:write_quotes`, `mcp:read_jobs`, `mcp:read_invoices`, and `mcp:read_visits`.

## Notes

- Jobs, invoices, and the schedule are read-only. The server cannot delete or archive any record.
- Create and update tools change real customer records. Review what the agent proposes before confirming.
- Jobber blocks automated browser agents from signing in, so use this MCP connection rather than a browser tool.

## Docs

- Connect Jobber to Claude and ChatGPT: https://help.getjobber.com/en/articles/connect-jobber-to-claude-and-chatgpt/
- Jobber Developer Center: https://developer.getjobber.com/
- Server URL: https://mcp.getjobber.com/mcp

Logo is Jobber's official mark, from the `GetJobber` GitHub organization.

## License

MIT
