# Spacefast

Cursor plugin that connects agents to [Spacefast](https://spacefast.com) through Spacefast's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Publish websites, dashboards, reports, and small web tools to shareable Spacefast links. The agent publishes the project you're working on to a Space, then updates the same Space each time you change it.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Spacefast**.
3. Click **Install**, then complete the Spacefast sign-in prompt.

Or run `/add-plugin spacefast` in chat.

## MCP

```json
{
  "mcpServers": {
    "spacefast": {
      "type": "http",
      "url": "https://mcp.spacefast.com"
    }
  }
}
```

Auth is OAuth 2.1 with dynamic client registration, so Cursor prompts for Spacefast sign-in when the plugin connects. There is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Spaces | List your Spaces and see who can open them |
| Publishing | Build a site, dashboard, report, or small web tool and publish it to a live Spacefast link |
| Updates | Republish changes to the same Space |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Spaces start private. You choose who can open them and can connect your own domain.
- Tool calls run as the Spacefast user who authorizes the connection.

## Docs

- Spacefast: https://spacefast.com
- Server URL: https://mcp.spacefast.com

Logo is the avatar of the `spacefast` GitHub organization. The submitted `https://spacefast.com/favicon.svg` could not be downloaded when this plugin was added.

## License

MIT
