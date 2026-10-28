# Convai Agent Authoring

Cursor plugin that connects agents to [Convai](https://convai.com) through Convai's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Author and manage Convai conversational agents for games and virtual worlds. Inspect your agents; create and edit backstories, voices, languages, and narratives; compare drafts with released versions; release or roll back versions; and connect existing knowledge documents.

Every change is confirmed with you before it is written to your Convai account. The plugin only accesses agents and documents in your own account. It does not upload documents or run function code.

Source: [Conv-AI/ConvAI-Agent-Plugin](https://github.com/Conv-AI/ConvAI-Agent-Plugin).

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Convai Agent Authoring**.
3. Click **Install**.
4. Click **Authenticate** on the `convai` server and sign in with your Convai account at `login.convai.com`.

Or run `/add-plugin convai-agent-authoring` in chat.

## MCP

```json
{
  "mcpServers": {
    "convai": {
      "type": "http",
      "url": "https://mcp-api.convai.com/mcp",
      "auth": {
        "CLIENT_ID": "grok-bot",
        "scopes": [
          "character:read",
          "character:write",
          "backstory:generate",
          "chat-history:read",
          "knowledge-bank:read",
          "knowledge-bank:write"
        ]
      }
    }
  }
}
```

## Skills

- `agent-inspect`: list agents and summarize how one is configured. Read-only.
- `agent-author`: create, edit, or delete an agent, its backstory, voice, language, and narrative.
- `agent-version-review`: diff versions, release, promote, roll back, or discard draft changes.
- `agent-knowledge`: connect or disconnect existing knowledge bank documents.

## Try it

- "List my Convai agents."
- "Show how my agent Review Guide is configured."
- "Create a Convai agent named Captain Mira, a retired starship pilot who runs a spaceport cafe."
