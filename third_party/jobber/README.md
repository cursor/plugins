# Jobber

Cursor plugin that connects agents to [Jobber](https://www.getjobber.com/) through Jobber's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Look up and manage clients, requests, and quotes, and read jobs, visits, and invoices in the signed-in Jobber account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Jobber**.
3. Click **Install**, then set the Client ID and Client Secret (below) and complete the Jobber sign-in prompt.

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

Jobber's OAuth server does not support Dynamic Client Registration and authenticates clients with a secret, so a Jobber app has to be registered before anyone can connect.

1. Sign in to the [Jobber Developer Center](https://developer.getjobber.com/) and create an app.
2. Register both redirect URIs on that app:
   - Desktop: `http://localhost:8787/callback`
   - Web and Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
3. Grant the MCP scopes the connection should have (listed below), then copy the app's **Client ID** and **Client Secret**.
4. In **Dashboard → Plugins → Configure**, set **Jobber Client ID** and **Jobber Client Secret** from that app.
5. Complete the Jobber OAuth login when Cursor prompts.

On a team marketplace an admin can set the credentials once for everyone; each member still completes their own Jobber OAuth login, so tool calls run with that member's Jobber permissions.

## What agents can do

| Area | Scopes |
| --- | --- |
| Clients | `mcp:read_clients`, `mcp:write_clients` |
| Requests | `mcp:read_requests`, `mcp:write_requests` |
| Quotes | `mcp:read_quotes`, `mcp:write_quotes` |
| Jobs | `mcp:read_jobs` |
| Invoices | `mcp:read_invoices` |
| Visits | `mcp:read_visits` |

Jobs, invoices, and visits are read-only. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Jobber: https://www.getjobber.com/
- Jobber Developer Center: https://developer.getjobber.com/
- Server URL: https://mcp.getjobber.com/mcp

Logo is Jobber's official mark, provided by Jobber.

## License

MIT
