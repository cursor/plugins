# Cursor PM plugin

MCP bundle for product workflows spanning meeting capture, call intelligence, docs, and team communication.

## Installation

```bash
/add-plugin cursor-pm
```

## Components

### MCP servers

| MCP | Purpose |
|:----|:--------|
| `granola` | Access Granola meeting notes and transcripts |
| `gong` | Pull Gong calls and transcript data for sales/customer context |
| `notion` | Read and write Notion pages and databases |
| `slack` | Search and post messages in Slack channels and threads |

## Configuration

This plugin exposes MCP server definitions in `mcp.json`. Set required environment variables before use:

- `GONG_ACCESS_KEY`
- `GONG_ACCESS_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_TEAM_ID`

## License

MIT
