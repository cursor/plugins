# Definitive Healthcare

Cursor plugin that connects agents to [Definitive Healthcare](https://www.definitivehc.com/) through a hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Connect agents to Definitive Healthcare's healthcare commercial intelligence.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Definitive Healthcare**.
3. Click **Install**, then complete the Definitive Healthcare sign-in prompt if one appears.

Or run `/add-plugin definitive-healthcare` in chat.

## MCP

```json
{
  "mcpServers": {
    "definitive-healthcare": {
      "type": "http",
      "url": "https://www.definitivehc.com/"
    }
  }
}
```

## Before you connect

You need a Definitive Healthcare account.

## Notes

- The hosted runtime is the source of truth for tool names and schemas.
- The server URL is the URL from the submission. The publisher described the MCP server as upcoming, so confirm the final endpoint with Definitive Healthcare before release.

## Docs

- Definitive Healthcare: https://www.definitivehc.com/
- Server URL: https://www.definitivehc.com/

The logo is not committed yet. definitivehc.com blocked automated requests when this plugin was added, the submitted logo URL was the homepage rather than an image, and Definitive Healthcare has no official GitHub organization, so `plugin.json` points at `https://www.definitivehc.com/favicon.ico`.

## License

MIT
