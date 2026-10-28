# Talaria

Cursor plugin that connects agents to [Talaria](https://www.newtalaria.com) through Talaria's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Triage errors, traces, and session replays from Talaria in your coding agent.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Talaria**.
3. Click **Install**, then complete the Talaria sign-in prompt.

Or run `/add-plugin talaria` in chat.

## MCP

```json
{
  "mcpServers": {
    "talaria": {
      "type": "http",
      "url": "https://api.newtalaria.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Talaria sign-in when the plugin connects, and you approve the `mcp:read`, `mcp:write`, and `mcp:keys` scopes for an organization. There is no API key to paste.

## Before you connect

You need a Talaria account (free accounts work) and an organization with at least one project.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Connection | Check the signed-in user, organization, and granted scopes |
| Projects | List projects in the organization |
| Errors | Search and inspect errors and issues |
| Traces and replays | Look up traces and session replays tied to an issue |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Talaria permissions of the user who authorizes the connection.

## Docs

- Talaria: https://www.newtalaria.com
- Server URL: https://api.newtalaria.com/mcp

Logo is the avatar of Talaria's `newtalaria` GitHub organization (256×256). newtalaria.com blocked automated requests when this plugin was added, so the submitted logo (https://www.newtalaria.com/logo-mark.png) was not downloaded from the website.

## License

MIT
