# Gamma

Cursor plugin that connects agents to [Gamma](https://developers.gamma.app/mcp/gamma-mcp-server.md) through Gamma's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Generate presentations, documents, and webpages.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Gamma**.
3. Click **Install**, then complete the Gamma sign-in prompt.

Or run `/add-plugin gamma` in chat.

## MCP

```json
{
  "mcpServers": {
    "gamma": {
      "type": "http",
      "url": "https://mcp.gamma.app/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Gamma sign-in when the plugin connects — there is no client ID or personal access token to configure.

## Before you connect

You need a Gamma account. Generations consume credits from that account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Generate | Presentations, documents, webpages, and social posts from a prompt, outline, or template |
| Export | PDF, PPTX, and PNG exports |
| Browse | List and read existing Gammas, themes, and folders |
| Analytics | Views and comments on existing Gammas |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Generation is asynchronous: tools return a generation id that the agent polls until complete.
- Auth is OAuth 2.0 with Dynamic Client Registration.

## Docs

- Gamma MCP server: https://developers.gamma.app/mcp/gamma-mcp-server.md
- Tools reference: https://developers.gamma.app/mcp/mcp-tools-reference.md
- Server URL: https://mcp.gamma.app/mcp

Logo is Gamma's official mark.

## License

MIT
