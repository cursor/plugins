# Workable

Cursor plugin that connects agents to [Workable](https://www.workable.com) through Workable's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search and advance candidates, manage jobs, offers, and requisitions, and work with employee, time-off, and performance records in the signed-in Workable account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Workable**.
3. Click **Install**, then complete the Workable sign-in prompt.

Or run `/add-plugin workable` in chat.

## MCP

```json
{
  "mcpServers": {
    "workable": {
      "type": "http",
      "url": "https://mcp.workable.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with dynamic discovery and Dynamic Client Registration. Cursor registers itself and prompts for Workable sign-in when the plugin connects — there is no API key to configure.

## Before you connect

MCP is included on every Workable subscription plan at no extra cost, and no admin role is required — access is scoped to the signed-in user's role.

Workable's MCP OAuth checks the client's redirect URI against a pre-approved list. Workable names Cursor as a supported client, but if sign-in fails with a **redirect URI mismatch**, ask Workable Support to allow Cursor's two fixed callbacks:

| Surface | Redirect URI |
|:--------|:-------------|
| Desktop | `http://localhost:8787/callback` |
| Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |

One quirk worth knowing: every tool except `get_accounts` takes an `account` parameter, so the agent has to call `get_accounts` first and reuse the returned subdomain.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Jobs & requisitions | Create and manage jobs, job posts, requisitions, and pipeline stages |
| Candidates | Search, create, comment on, rate, and move candidates through stages |
| Offers & members | Manage offers, team members, and account configuration |
| Employees | Employee records, departments, legal entities, and work schedules |
| Time off & tracking | Time-off requests and balances, plus time tracking entries |
| Performance | Performance reviews and review cycles |

The hosted runtime is the source of truth for tool names and schemas. Call `get_accounts` as a read-only smoke test after connecting — you need its `subdomain` for every other tool anyway.

## Notes

- Tool calls run as the Workable user who authorizes the connection and cannot exceed that user's role permissions.
- The server spans ATS **and** HRIS, so it can write to employee, time-off, time-tracking, and performance data — not just recruiting.
- Transport is stateless streamable HTTP in JSON mode. There is no SSE endpoint.

## Docs

- Workable MCP server: https://workable.readme.io/reference/workable-mcp-server
- Using the Workable MCP server: https://help.workable.com/hc/en-us/articles/39415735712407-Using-the-Workable-MCP-server-to-connect-to-AI-assistant
- Server URL: https://mcp.workable.com/mcp

Logo is Workable's official mark, from the `Workable` GitHub organization.

## License

MIT
