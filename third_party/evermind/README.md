# EverMe

Cursor plugin that connects agents to [EverMe](https://everme.evermind.ai) by EverMind through EverMe's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

EverMe is a long-term memory layer for your AI agents. It remembers your preferences, project context, and key decisions, and shares them across Cursor and other connected agents, so each one picks up where you left off.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **EverMe**.
3. Click **Install**, then complete the EverMe sign-in prompt.

Or run `/add-plugin evermind` in chat.

## MCP

```json
{
  "mcpServers": {
    "evermind": {
      "type": "http",
      "url": "https://api.everme.evermind.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for EverMe sign-in when the plugin connects; there is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Profile | Load your EverMe profile and preferences |
| Recall | Search and recall relevant memories |
| Capture | Save new facts and conversation turns as you work |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Memories are stored in the EverMe account of the user who authorizes the connection and are shared with that user's other connected agents.

## Docs

- EverMe: https://everme.evermind.ai
- Source and other agent plugins: https://github.com/EverMind-AI/EverMe
- Server URL: https://api.everme.evermind.ai/mcp

Logo is the EverMe mark from the `EverMind-AI/EverMe` GitHub repository (512×512 PNG).

## License

MIT
