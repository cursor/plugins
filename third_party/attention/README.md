# Attention

Cursor plugin that connects agents to [Attention](https://www.attention.com), an AI conversation intelligence platform for sales teams, through Attention's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search sales conversations, read call transcripts and scorecards, get coaching and deal insights, and chat with the Attention super agent.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Attention**.
3. Click **Install**, then sign in with your Attention account when Cursor prompts.

Or run `/add-plugin attention` in chat.

## MCP

```json
{
  "mcpServers": {
    "attention": {
      "type": "http",
      "url": "https://api.attention.tech/mcp"
    }
  }
}
```

## Authentication

The server uses OAuth 2.0 with PKCE (scopes `mcp:read` and `mcp:write`). No API key is needed: you sign in with your Attention account and the agent acts as that account.

## Skills

- `conversations`: search, browse, and analyze sales conversations, transcripts, scorecards, and coaching feedback.

## Docs

- Attention MCP server: https://docs.attention.com/attention-mcp-server
- Plugin source: https://github.com/attentiontech/attention

## License

MIT
