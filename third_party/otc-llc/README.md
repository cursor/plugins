# OTC

Cursor plugin that connects agents to [OTC](https://otc.network) through OTC's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Help create a passkey.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **OTC**.
3. Click **Install**, then complete any sign-in prompt the server shows.

Or run `/add-plugin otc-llc` in chat.

## MCP

```json
{
  "mcpServers": {
    "otc-llc": {
      "type": "http",
      "url": "https://otc.network/api/otc/mcp"
    }
  }
}
```

The hosted runtime is the source of truth for tool names and schemas.

## Try it

Follow the passkey walkthrough at https://otc.network/passkey?section=passkey.

## Docs

- OTC: https://otc.network
- Server URL: https://otc.network/api/otc/mcp

Logo is OTC's theta mark from the verified `otc-ai` GitHub organization (contact `ai@otc.network`), 256×256. The submitted logo URL (`https://otc.network/otc-theta-favicon.svg`) could not be downloaded when this plugin was added.

## License

MIT
