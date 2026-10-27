# Airtasker

Cursor plugin that connects agents to [Airtasker](https://www.airtasker.com) through Airtasker's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Get help with everyday jobs, or find paid work nearby. Describe what you need, from cleaning, removals and furniture assembly to gardening, deliveries and odd jobs, and Airtasker posts it for you. Local Taskers make offers, you compare them and choose who to hire, all without leaving the conversation. Looking for work instead? Browse jobs in your area, make offers, and get help writing ones that win the job.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Airtasker**.
3. Click **Install**, then complete the Airtasker sign-in prompt.

Or run `/add-plugin airtasker` in chat.

## MCP

```json
{
  "mcpServers": {
    "airtasker": {
      "type": "http",
      "url": "https://mcp.airtasker.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor opens the Airtasker sign-in the first time the server connects.

## Before you connect

You need an Airtasker account. To post a task you also need Airtasker credits, a payment method, or an Airtasker membership.

## What agents can do

| Tool | What it does |
| --- | --- |
| `browse_tasks` | Search the Airtasker marketplace |
| `get_task` | Pull full task details |
| `post_task` | Post a new task |
| `get_my_tasks` | See your tasks |
| `get_offers` | Check offers on your tasks |
| `accept_offer` | Hire a Tasker and escrow payment |
| `get_profile` | Look up a public user profile |

The hosted runtime is the source of truth for tool names and schemas.

## Skills

| Skill | What it does |
| --- | --- |
| `post-task` | Guided conversation that collects job details, location, timing, and budget, then posts via `post_task`. |

## Notes

- Tool calls run under the Airtasker account of the user who authorizes the connection.
- `accept_offer` hires the Tasker and charges the connection fee for non-members.

## Docs

- Airtasker: https://www.airtasker.com
- Source: https://github.com/airtasker/airtasker-mcp-server
- Server URL: https://mcp.airtasker.com/mcp

The MCP config, `post-task` skill, and logo are copied from [airtasker/airtasker-mcp-server](https://github.com/airtasker/airtasker-mcp-server) at commit `39abb0f`. The logo is the repository's `images/airtasker-icon.svg`.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
