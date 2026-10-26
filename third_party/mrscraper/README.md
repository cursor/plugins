# MrScraper

Cursor plugin that connects agents to [MrScraper](https://mrscraper.com/) through MrScraper's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Web scraping and Google search for AI agents: fetch any public page as Markdown, HTML or a screenshot, and get parsed Google results.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **MrScraper**.
3. Click **Install**, then complete the MrScraper sign-in prompt.

Or run `/add-plugin mrscraper` in chat.

## MCP

```json
{
  "mcpServers": {
    "mrscraper": {
      "type": "http",
      "url": "https://mcp.mrscraper.com/mcp"
    }
  }
}
```

Cursor opens the MrScraper sign-in page when the plugin connects.

## Before you connect

You need a MrScraper account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Scraping | Fetch any public page as Markdown, HTML, or a screenshot |
| Search | Run Google searches and get parsed results |
| Account | Check MrScraper plan usage |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the MrScraper account of the user who signs in, and count against that account's plan.

## Docs

- MrScraper: https://mrscraper.com/
- Server URL: https://mcp.mrscraper.com/mcp

Logo is MrScraper's 512×512 logo plate from the `mrscraper-com/mrscraper-claude-plugin` GitHub repository.

## License

MIT
