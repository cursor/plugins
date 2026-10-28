# Phonic

Cursor plugin that connects agents to [Phonic](https://phonic.ai) through Phonic's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, plus Phonic's skills for building voice agents.

Build and test Phonic voice agents from your coding assistant. Connect your Phonic account, search product documentation, configure agents, discover voices, and get ready for your first conversation.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Phonic**.
3. Click **Install**, then complete the Phonic sign-in prompt.

Or run `/add-plugin phonic` in chat.

## MCP

```json
{
  "mcpServers": {
    "phonic": {
      "type": "http",
      "url": "https://mcp.phonic.ai/mcp"
    }
  }
}
```

Auth is OAuth through the client's MCP sign-in flow; an API key also works. OAuth selects the workspace for the connection.

## Before you connect

You need a Phonic account and workspace. Sign up at [phonic.ai](https://phonic.ai).

## Skills

| Skill | When to use it |
| --- | --- |
| `phonic-get-started` | Connect MCP, build an agent, and run a first conversation. |
| `phonic` | Choose an integration and find the relevant implementation skill. |
| `phonic-agents` | Configure agents, phone calls, prompts, and project operations. |
| `phonic-voices` | Discover and preview voices. |
| `phonic-websockets` | Build browser voice sessions and server audio bridges. |
| `phonic-tools` | Connect tools and transfer callers. |
| `phonic-post-call` | Process webhooks, extractions, and evaluations. |
| `phonic-improvement-loop` | Run prompt experiments with simulated conversations. |
| `phonic-steering` | Update live conversations. |

The hosted runtime is the source of truth for tool names and schemas. Documentation search is provided through `search_docs` on the same connection.

## Docs

- Phonic: https://phonic.ai
- Documentation: https://docs.phonic.ai
- Source: https://github.com/Phonic-Co/skills
- Support: support@phonic.ai

Skills, MCP config, and logo are copied from [Phonic-Co/skills](https://github.com/Phonic-Co/skills).

## License

MIT
