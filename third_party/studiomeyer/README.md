# StudioMeyer Memory

Cursor plugin that connects agents to [StudioMeyer Memory](https://studiomeyer.io/en/services/memory) through StudioMeyer's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Give your AI a shared long-term memory. StudioMeyer Memory stores decisions and knowledge across assistants, finds relevant context when you need it, and connects it in a time-aware knowledge graph.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **StudioMeyer Memory**.
3. Click **Install**, then complete the StudioMeyer Memory sign-in prompt in your browser.

Or run `/add-plugin studiomeyer` in chat.

## MCP

```json
{
  "mcpServers": {
    "studiomeyer": {
      "type": "http",
      "url": "https://memory.studiomeyer.io/mcp"
    }
  }
}
```

Auth is OAuth. Cursor opens a browser sign-in for your StudioMeyer Memory account when the plugin connects. There is no API key to configure.

## Before you connect

You need a StudioMeyer Memory account. There is a free plan, with optional paid capacity.

## Getting started

Ask the agent to run the read-only `nex_guide` tool with `topic=quickstart` to get the quickstart guide.

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Memories are stored under the StudioMeyer Memory account that authorizes the connection and are shared with other assistants connected to that account.

## Docs

- StudioMeyer Memory: https://studiomeyer.io/en/services/memory
- Server URL: https://memory.studiomeyer.io/mcp

Logo is the StudioMeyer avatar from the `studiomeyer-io` GitHub organization, as submitted by the publisher.

## License

MIT
