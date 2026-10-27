# Flaim Fantasy

Cursor plugin that connects agents to [Flaim Fantasy](https://flaim.app) through Flaim's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Flaim Fantasy reads your real ESPN, Yahoo, and Sleeper fantasy leagues, so start/sit calls, waiver pickups, and trade reviews are based on your actual roster and scoring, not generic rankings. Private ESPN leagues work, and you never give Flaim your ESPN password.

This application uses fantasy data provided by Yahoo Fantasy.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Flaim Fantasy**.
3. Click **Install**, then complete the Flaim sign-in prompt in your browser.

Or run `/add-plugin flaim-fantasy` in chat.

## MCP

```json
{
  "mcpServers": {
    "flaim-fantasy": {
      "type": "http",
      "url": "https://api.flaim.app/mcp?auth=required"
    }
  }
}
```

The server uses Streamable HTTP with OAuth 2.1 + PKCE and dynamic client registration, so Cursor prompts for Flaim sign-in when the plugin connects. There is no client ID or API key to configure.

## Before you connect

1. Sign up for free at [flaim.app](https://flaim.app).
2. Connect your leagues at [flaim.app/leagues](https://flaim.app/leagues). Sleeper needs only a public username; ESPN and Yahoo leagues are linked from the same page.

## Example prompts

- "What fantasy leagues do I have?"
- "Who should I start at flex?"
- "Who's the best pickup on my waiver wire?"
- "Should I accept this trade?"

## Notes

- Flaim is read-only. It never sets lineups, makes trades, or adds or drops players.
- Free, no ads.
- The hosted runtime is the source of truth for tool names and schemas.

## Docs

- Flaim Fantasy: https://flaim.app
- Docs: https://flaim.app/docs
- Server URL: https://api.flaim.app/mcp?auth=required

Logo is the icon from Flaim's official plugin repository ([jdguggs10/flaim-fantasy](https://github.com/jdguggs10/flaim-fantasy), `.claude-plugin/icon.png`). The submitted logo URL (`https://flaim.app/apple-icon.png`) could not be fetched when this plugin was added because flaim.app refused the TLS connection.

## License

MIT
