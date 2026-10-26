# Odyssey365

Cursor plugin that connects agents to [Odyssey365](https://product.odyssey365.app/) through Odyssey's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Manage your Odyssey60 project boards, tasks, notes, calendar events, routines, and records. Turn plans into boards, get progress briefings, and manage your day through conversation.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Odyssey365**.
3. Click **Install**, then complete the Odyssey sign-in prompt.

Or run `/add-plugin odyssey365` in chat.

## MCP

```json
{
  "mcpServers": {
    "odyssey365": {
      "type": "http",
      "url": "https://mcp-odyssey30-60.odyssey365.app/"
    }
  }
}
```

Auth is OAuth. Sign in with your own Odyssey account when the plugin connects; there is no API key to configure.

## Before you connect

You need an Odyssey365 account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Boards | Create boards and lists, turn plans into boards, and read back board state |
| Tasks | Create, read, and update tasks and to-dos |
| Notes and records | Read and write notes and records |
| Calendar and routines | Manage calendar events and routines |
| Briefings | Summarize progress across boards |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Access is limited to the signed-in user's data and boards shared with them.

## Docs

- Odyssey365: https://product.odyssey365.app/
- Server URL: https://mcp-odyssey30-60.odyssey365.app/

Logo is `assets/logo.png` from the publisher's [Odyssey365App/odyssey-plugin](https://github.com/Odyssey365App/odyssey-plugin) repository. The odyssey365.app hosts could not be reached when this plugin was added, so the file was not downloaded from the website.

## License

MIT
