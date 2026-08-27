# Outreach

Cursor plugin that connects agents to [Outreach](https://www.outreach.ai) through Outreach's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search sequences, prospects, accounts, and Kaia meetings, then create sequences, tasks, and records in the signed-in Outreach instance.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Outreach**.
3. Click **Install**, then complete the Outreach sign-in prompt.

Or run `/add-plugin outreach` in chat.

## MCP

```json
{
  "mcpServers": {
    "outreach": {
      "type": "http",
      "url": "https://api.outreach.io/mcp"
    }
  }
}
```

Auth is OAuth 2.1 against Outreach with Dynamic Client Registration (DCR) and PKCE. Cursor registers itself and prompts for Outreach sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

An Outreach admin must enable MCP Server for the organization first: **Administration → Organization → Org Info → Gen AI** and toggle **MCP Server** on. Create actions are on by default; delete actions are off by default.

The organization also needs the Amplify add-on with active credits. If the toggle is missing or greyed out, the org may not have Amplify — check with your Outreach AE.

You must be an active, licensed user in that Outreach instance. Sign in with the account for the instance you want to use; the browser session is what Outreach uses to pick the org.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Conversational intelligence | Search Kaia meetings, fetch transcripts and summaries, and search emails |
| Sequences | Look up sequences, create or delete them, enroll or remove prospects, and track sequence state |
| Accounts, prospects, deals | Search and look up by CRM ID, create or delete records, and ask account or opportunity questions |
| Tasks & calendar | Create and search tasks; fetch calendar events |
| Org & schema | Current user/org, teams, stages, and filter/input schemas for search and create |

The hosted runtime is the source of truth for tool names and schemas. Call `current_user` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Outreach user who authorizes the connection and cannot exceed that user's profile permissions.
- Outreach MCP does not update existing records. Write tools are create, enroll, and delete only; delete tools require confirmation and may be disabled org-wide.
- Client-credential (non-user) auth is not supported. The identity must be an active licensed Outreach user.
- API throttle limits apply. Keep payloads lean: specific filters, date ranges, and IDs before broad searches.
- Connect one Outreach instance per session. Multiple instances in the same chat can confuse tool results.

## Docs

- Outreach MCP server overview: https://support.outreach.io/support/solutions/articles/159000425158-outreach-mcp-server-overview
- Developer portal: https://developers.outreach.io/mcp-server
- Authentication (OAuth 2.1 + DCR): https://developers.outreach.io/mcp-server/authentication
- Tool catalog: https://developers.outreach.io/mcp-server/tool-catalog
- Server URL: https://api.outreach.io/mcp

Logo is Outreach's official apple-touch icon (purple nucleo on black) from https://www.outreach.ai.

## License

MIT
