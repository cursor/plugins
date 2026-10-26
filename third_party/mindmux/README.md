# MindMux

Cursor plugin that connects agents to [MindMux](https://mindmux.ai) through MindMux's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Give agents persistent, shared project memory. Each MindMux project has a Cloud Brain made of versioned Markdown pages with a timeline of changes, so decisions and context captured in one session are available in the next.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **MindMux**.
3. Click **Install**, then complete the MindMux sign-in prompt.

Or run `/add-plugin mindmux` in chat.

## MCP

```json
{
  "mcpServers": {
    "mindmux": {
      "type": "http",
      "url": "https://mcp.mindmux.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts you to sign in to mindmux.ai when the plugin connects.

## Before you connect

You need a MindMux account with access to at least one workspace.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Workspaces | List workspaces, projects, and Cloud Brains |
| Pages | Search, read, create, and update versioned Markdown pages |
| Timeline | Append timeline entries to record decisions and changes |
| Compiled truth | Maintain a "compiled truth" summary for each topic |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the MindMux permissions of the user who authorizes the connection.

## Docs

- MindMux: https://mindmux.ai
- Server URL: https://mcp.mindmux.ai/mcp

The logo references MindMux's hosted icon at https://mindmux.ai/icon.svg. The file could not be downloaded when this plugin was added.

## License

MIT
