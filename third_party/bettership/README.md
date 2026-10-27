# Bettership

Cursor plugin that connects agents to [Bettership](https://www.bettership.ai) through Bettership's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Bring what you're learning into Cursor. Read your Bettership Library and use the prompts, context packs, and skills you've made from it. Access is read-only.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Bettership**.
3. Click **Install**, then sign in to Bettership and review the requested access.

Or run `/add-plugin bettership` in chat.

## MCP

```json
{
  "mcpServers": {
    "bettership": {
      "type": "http",
      "url": "https://api.bettership.ai/mcp"
    }
  }
}
```

Cursor prompts for Bettership sign-in when the plugin connects. There is no API key to configure.

## Skills

- `use`: find and apply your published Bettership items, and draw on resources in your Bettership Library.

## Before you connect

Requires Bettership Plus or Max, including active Plus beta access. Cursor can read your Library, your published items, or both, depending on the access you allow. It cannot add, change, or delete anything in Bettership. Disconnect in Bettership Settings to stop future reads.

## Example prompts

- "Show me the items I've published in Bettership."
- "Use my Bettership item <name> on this draft."
- "What does my Bettership Library say about <topic>?"

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Bettership: https://www.bettership.ai
- Setup guide: https://docs.bettership.ai/apply/use-what-you-made-in-your-ai-tools
- Support: support@bettership.ai
- Privacy: https://www.bettership.ai/privacy
- Terms: https://www.bettership.ai/terms
- Source: https://github.com/Bettership/plugins

Operated by Scoutio LLC. Logo and skill are copied from Bettership's official [`Bettership/plugins`](https://github.com/Bettership/plugins) repository (v0.1.14).

## License

MIT
