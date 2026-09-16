# Ahrefs

Cursor plugin that connects agents to [Ahrefs](https://ahrefs.com) through Ahrefs's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query live Ahrefs SEO data — backlinks, keyword metrics, rank tracking, and site audits — from the signed-in Ahrefs account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Ahrefs**.
3. Click **Install**, then complete the Ahrefs sign-in prompt.

Or run `/add-plugin ahrefs` in chat.

## MCP

```json
{
  "mcpServers": {
    "ahrefs": {
      "type": "http",
      "url": "https://api.ahrefs.com/mcp/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Ahrefs sign-in when the plugin connects, and the consent screen mints an MCP-scoped key on the Ahrefs side. Leave any OAuth client ID and secret blank.

## Before you connect

You need a paid Ahrefs plan (Lite or higher). MCP calls consume the plan's Integration API units, and the row cap per response scales with the tier — 100 on Lite, 250 on Standard, 500 on Advanced, unlimited on Enterprise.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Site Explorer | Backlink profiles, referring domains, organic traffic, and top pages |
| Keywords Explorer | Keyword metrics, matching terms, and SERP overviews |
| Rank Tracker | Tracked keyword positions and visibility over time |
| Site Audit | Crawl results and technical SEO issues |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Ahrefs user who authorizes the connection and consume that account's API units.
- Ahrefs MCP keys and API v3 keys are separate and not interchangeable. The OAuth consent screen mints the MCP-scoped key for you; you can also generate one under **Account Settings → API Keys → Generate MCP key** and skip OAuth by sending it as `"headers": {"Authorization": "Bearer <MCP_KEY>"}` instead.
- The `@ahrefs/mcp` npm package is Ahrefs' old local server, and Ahrefs no longer supports local setup at all: "Local MCP setup is no longer supported. We only support remote MCP server for now."

## Docs

- Ahrefs MCP: https://ahrefs.com/mcp
- Getting started with Ahrefs MCP: https://help.ahrefs.com/en/articles/13913559-getting-started-with-ahrefs-mcp
- Ahrefs for Developers: https://docs.ahrefs.com/
- Connection settings (Copilot Studio): https://docs.ahrefs.com/mcp/docs/copilot-studio
- Server URL: https://api.ahrefs.com/mcp/mcp

Logo is Ahrefs's official mark, from the `ahrefs` GitHub organization.

## License

MIT
