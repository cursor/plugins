# Lannis

Cursor plugin that connects agents to [Lannis](https://lannis.app) through Lannis's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Issue invoices and track your taxes in Argentina ("Facturá y seguí tus impuestos").

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Lannis**.
3. Click **Install**, then complete the Lannis sign-in prompt.

Or run `/add-plugin lannis` in chat.

## MCP

```json
{
  "mcpServers": {
    "lannis": {
      "type": "http",
      "url": "https://mcp.lannis.app/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Lannis sign-in when the plugin connects — there is no API key to configure.

## Before you connect

You need a Lannis account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Invoices | List invoices and totals for a period; preview and issue new invoices after you approve them |
| Taxes | Track tax obligations and generate VEP payment slips to pay at your bank |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run under the Lannis account of the user who authorizes the connection.
- Issuing an invoice is shown as a preview first and only happens after you approve it.

## Docs

- Lannis: https://lannis.app
- Server URL: https://mcp.lannis.app/mcp

The logo references the publisher-submitted URL (`https://lannis.app/icon-512.png`). lannis.app could not be reached when this plugin was added, so the file was not committed.

## License

MIT
