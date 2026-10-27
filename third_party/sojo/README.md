# Sojo

Cursor plugin that connects agents to [Sojo](https://sojo.gg) through Sojo's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Make games that play inside posts on X. Create, deploy and run them from chat, then get paid.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Sojo**.
3. Click **Install**, then complete the Sojo sign-in prompt.

Or run `/add-plugin sojo` in chat.

## MCP

```json
{
  "mcpServers": {
    "sojo": {
      "type": "http",
      "url": "https://sojo.gg/mcp"
    }
  }
}
```

Auth is OAuth. When the plugin connects, Cursor opens sojo.gg, where you sign in with X and click **Allow**. Sojo reads only your X name, handle, and picture, and posts nothing.

## What agents can do

- Show your Sojo account and games.
- Create a Sojo-hosted game and write its `sojo.json`.
- Deploy a game and check its dev URL and health.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Sojo: https://sojo.gg
- Server URL: https://sojo.gg/mcp

The logo points to https://sojo.gg/logo.png. sojo.gg could not be reached when this plugin was added, so no local copy is committed.

## License

MIT
