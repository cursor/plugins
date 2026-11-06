# Crimson Health

Grok Bot plugin that connects agents to [Crimson Health](https://www.crimson.healthcare) through Crimson Health's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your Crimson Health record (medications and treatments, lab results, wearable trends, goals, and health journal) and, if you allow it, add notes to your journal.

## Who can use it

- Grok Bot **0.49** or newer.
- Not available in Cursor. Crimson's sign-in identifies clients by Client ID Metadata Document and does not offer dynamic client registration, and Cursor desktop signs in to MCP servers only through dynamic client registration or a fixed client ID.
- A Crimson Health account.

## MCP

```json
{
  "mcpServers": {
    "crimson-health": {
      "type": "http",
      "url": "https://mcp.crimson.healthcare/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. An unauthenticated request returns `401` with `resource_metadata` pointing at `https://mcp.crimson.healthcare/.well-known/oauth-protected-resource/mcp`. The authorization server is `https://mcp.crimson.healthcare`, and Grok Bot signs in with Cursor's published Client ID Metadata Document (`https://cursor.com/oauth/mcp-client.json`), so there is no client ID or key to configure. On Crimson's consent page you tick the parts of your record to share. The journal starts unticked.

## Before you connect

This is medical information. Connecting an assistant sends what you share to the company behind that assistant, and that company's privacy policy and terms then govern its copy. Crimson cannot delete that copy for you. Crimson keeps protecting the record it holds, and you can stop future access any time.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Medications and treatments | What you take, the dose and schedule, when you started, and your dose log |
| Wearable trends | Sleep, HRV, resting heart rate, steps, weight, and more from devices connected to Crimson, up to 90 days |
| Lab results | Latest value for each biomarker with earlier results for trend, plus body composition and coronary calcium scans when available |
| Goals and scores | Active goals and progress, and your Optimization Score with its next steps |
| Health journal | Your journal entries from the last four weeks; off unless you turn it on |
| Add to journal | Save notes from the conversation, marked as co-authored with the assistant; off unless you turn it on |

Tools: `get_current_medications`, `get_wearable_trends`, `get_lab_results`, `get_goals_and_scores`, `get_journal_entries`, and `add_journal_entry`. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Each category is its own read scope (`health.medications`, `health.wearables`, `health.labs`, `health.goals`, `health.journal`), plus `health.journal.write` for adding notes. The assistant reads only what you shared.
- The server cannot change a prescription, order anything, or message your care team.
- To disconnect, open **Manage your data → Connected AI tools** in the Crimson app or on the web. Access stops right away.

## Docs

- Crimson Health MCP: https://www.crimson.healthcare/mcp
- Server URL: https://mcp.crimson.healthcare/mcp

Logo is Crimson Health's official logomark, the `icon.svg` from crimson.healthcare.

## License

MIT
