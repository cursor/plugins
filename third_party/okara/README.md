# Okara

Cursor plugin that connects agents to [Okara](https://okara.ai), an AI CMO for your product, through Okara's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your marketing workspace (strategy, SEO and AI-search audits, Search Console data, Reddit opportunities and articles) and act on it: generate content for posts, rewrite drafts, generate articles and images, and manage competitors and content strategy.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Okara**.
3. Click **Install**, then complete the Okara connection prompt.

Or run `/add-plugin okara` in chat.

## MCP

```json
{
  "mcpServers": {
    "okara": {
      "type": "http",
      "url": "https://okara.ai/api/mcp"
    }
  }
}
```

If your client asks for credentials, add an Okara MCP API key from your Okara workspace as a request header:

```json
"headers": { "Authorization": "Bearer <your-okara-mcp-key>" }
```

## Before you connect

You need an Okara account with at least one project (growth agent).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Workspace | List growth agents (projects) and read marketing strategy |
| SEO and AI search | Read SEO and AI-search audits and Search Console data |
| Reddit | Find Reddit opportunities and generate replies |
| Content | Generate posts, rewrite drafts, and generate articles and images |
| Strategy | Manage competitors and content strategy |

Start with `list_growth_agents` to get a project's `agentId`. The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Okara: https://okara.ai
- Server URL: https://okara.ai/api/mcp

Logo is Okara's mark from the `askOkara` GitHub organization. okara.ai refused connections from the build environment when this plugin was added, so the submitted logo (`https://okara.ai/images/growth-logo-black.svg`) was not downloaded.

## License

MIT
