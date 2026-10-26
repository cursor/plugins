# Sojo

Cursor plugin that connects agents to [Sojo](https://sojo.gg) through Sojo's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Make games that play inside posts on X. Create, deploy and run them from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Sojo**.
3. Click **Install**, then click **Authorize** and sign in to Sojo with your X account.

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

Auth is OAuth. Sojo signs you in with X and reads only your X name, handle, and profile picture. Nothing is posted to your account.

## What agents can do

- Show your Sojo account and games.
- Create a Sojo-hosted game, write its `sojo.json`, and deploy it.
- Check a game's dev URL and health.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Sojo: https://sojo.gg
- Server URL: https://sojo.gg/mcp

The logo points at `https://sojo.gg/logo.png`. sojo.gg was unreachable when this plugin was added, so no local copy was committed.

## License

MIT
