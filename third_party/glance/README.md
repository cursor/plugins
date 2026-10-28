# Glance

Cursor plugin that connects agents to [Glance](https://glance.cool) through Glance's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create and update native iPhone Home Screen widgets. Glance turns your content, connected apps, and agent outputs into widgets, from daily summaries and task lists to live metrics and dashboards. Design layouts, manage widgets, and push fresh content through MCP.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Glance**.
3. Click **Install**, then complete the Glance sign-in prompt.

Or run `/add-plugin glance` in chat.

## MCP

```json
{
  "mcpServers": {
    "glance": {
      "type": "http",
      "url": "https://glance-api.fly.dev/mcp"
    }
  }
}
```

Auth is Glance OAuth. Cursor prompts for Glance sign-in when the plugin connects.

## Before you connect

You need a Glance account. To see widgets on your Home Screen, install the Glance iPhone app, sign in with the same account, and add a Glance widget.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Widgets | List, create, and update Home Screen widgets |
| Layouts | Design widget layouts and sizes |
| Content | Push fresh text, metrics, and summaries to existing widgets |

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Glance: https://glance.cool
- Server URL: https://glance-api.fly.dev/mcp

No logo file is committed yet. The submitted icon (https://glance.cool/apple-touch-icon.png) and the App Store icon for Glance - Home Screen Feeds (https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/2c/96/8b/2c968b93-8fe6-18be-4db8-d6daa1ab65a1/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.png) could not be downloaded when this plugin was added.

## License

MIT
