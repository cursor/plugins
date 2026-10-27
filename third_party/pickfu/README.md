# PickFu

Cursor plugin that connects agents to [PickFu](https://www.pickfu.com) through PickFu's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run fast consumer polls with real people. Draft, preview, and publish PickFu polls, then read results.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **PickFu**.
3. Click **Install**, then complete the PickFu sign-in prompt.

Or run `/add-plugin pickfu` in chat.

## MCP

```json
{
  "mcpServers": {
    "pickfu": {
      "type": "http",
      "url": "https://mcp.pickfu.com/mcp"
    }
  }
}
```

Auth is OAuth. The first time a tool runs, Cursor sends you to PickFu's sign-in page. A free PickFu account works; there is no API key to configure.

## Cost

Drafting, editing, and previewing polls is free. Publishing a poll, adding respondents, and generating image variants spend PickFu credits. The bundled skill tells the agent to draft first and confirm the cost before anything that spends.

## Components

| Path | Role |
| --- | --- |
| `mcp.json` | Remote `pickfu` MCP server |
| `skills/pickfu-consumer-polls/` | When to call PickFu tools; never invent results |

## Docs

- PickFu: https://www.pickfu.com
- MCP server docs: https://www.pickfu.com/docs/developers/mcp-server
- Plugin source: https://github.com/pickfu/pickfu-mcp-plugin

Logo is PickFu's mark from the `pickfu` GitHub organization avatar. The submitted logo URL and pickfu.com could not be reached when this plugin was added.

## License

MIT
