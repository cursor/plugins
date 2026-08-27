# Amplemarket

Cursor plugin that connects agents to [Amplemarket](https://www.amplemarket.com) through Amplemarket's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search people and companies, enrich contacts, manage lead lists and sequences, and pull analytics in the signed-in Amplemarket account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Amplemarket**.
3. Click **Install**, then complete the Amplemarket sign-in prompt.

Or run `/add-plugin amplemarket` in chat.

## MCP

```json
{
  "mcpServers": {
    "amplemarket": {
      "type": "http",
      "url": "https://mcp.amplemarket.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Amplemarket. Cursor prompts for Amplemarket sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

You need an active Amplemarket account. Each user signs in individually; tool calls run with that user's permissions.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Search | People and companies with Searcher filters; saved searches and personas |
| Enrichment | Person and company enrichment by email, LinkedIn URL, domain, or name + company |
| Contacts & accounts | List and look up contacts/accounts, add notes, and check exclusion lists |
| Lead lists | Create lists, add or remove leads, and manage custom columns |
| Sequences | List sequences, create drafts, append or edit steps, and enroll or remove leads |
| Workflows | List and inspect workflows; admins can create drafts via the AI Workflows agent |
| Duo, inbox, tasks | Duo recommended leads, Unibox threads, tasks, and natural-language analytics |

The hosted runtime is the source of truth for tool names and schemas. Call `list_tasks` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Amplemarket user who authorizes the connection and cannot exceed that user's permissions.
- `enrich_person` costs 0.5 credits per enrichment (same as in-app). Results cache for 24 hours. Revealing email or phone costs extra credits.
- The MCP server is rate-limited to 100 requests per minute per user.
- Sequence tools create and edit **draft** sequences only. Sequences are linear (no branching or HTTP-request steps). Launch, structural edits, and step deletion happen in the Amplemarket dashboard.
- `create_workflow` is admin-only (25 per user per day). Drafts must be reviewed and activated in Amplemarket.
- `complete_task` records completion only — it does not send the email, place the call, or perform the LinkedIn action.

## Docs

- Connecting to the Amplemarket MCP server: https://knowledge.amplemarket.com/articles/8022685319-connecting-to-the-amplemarket-mcp-server
- Building sequences with MCP: https://knowledge.amplemarket.com/articles/2128059926-building-sequences-with-amplemarket-mcp
- MCP overview: https://www.amplemarket.com/integrations/mcp-model-context-protocol
- Server URL: https://mcp.amplemarket.com/mcp

Logo is Amplemarket's official app icon (white A on black) from https://brand.amplemarket.com.

## License

MIT
