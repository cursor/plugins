# Mnemos

Cursor plugin that connects agents to Mnemos by [ScriptMasterLabs](https://scriptmasterlabs.com) through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Persistent memory for AI agents: store, recall, and recommend from long-term memory.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Mnemos**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs-mnemos` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://mnemos-agent.onrender.com/mcp"
    }
  }
}
```

There is no API key or sign-in to configure. The publisher describes some read tools as free to call.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Store | Save facts and context to long-term memory |
| Recall | Retrieve stored memories in later sessions |
| Recommend | Get suggestions based on what has been stored |

The hosted runtime is the source of truth for tool names, schemas, and pricing.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
