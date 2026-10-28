# HalloFelix

Cursor plugin that connects agents to [HalloFelix von InsurMagic](https://www.hallofelix.de) through HalloFelix's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

HalloFelix is the AI phone and WhatsApp assistant for insurance brokers in Germany, Austria and Switzerland. The plugin lets agents work in the broker's HalloFelix account: calls with transcripts and summaries, customers, outbound call campaigns, phone, e-mail and WhatsApp assistants, the WhatsApp inbox, task types, calendars and account settings.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HalloFelix**.
3. Click **Install**, then sign in with your HalloFelix account and click **Zugriff erlauben** (allow access).

Or run `/add-plugin insurmagic` in chat.

## MCP

```json
{
  "mcpServers": {
    "insurmagic": {
      "type": "http",
      "url": "https://app.hallofelix.de/api/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with dynamic client registration. Cursor prompts for HalloFelix sign-in when the plugin connects; there is no API key to configure.

## Before you connect

You need a HalloFelix account. Only account admins can authorize the connection.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Calls | Read calls with transcripts and summaries |
| Customers | Look up and update customers |
| Campaigns | Create and manage outbound call campaigns |
| Assistants | View and configure phone, e-mail and WhatsApp assistants |
| WhatsApp inbox | Chats, messages, notes, labels and templates |
| Account | Task types, calendars and account settings |

The hosted runtime is the source of truth for tool names and schemas (117 tools at submission time).

## Notes

- Starting a campaign or an outbound call places real phone calls.
- Tool calls run under the HalloFelix account of the user who authorizes the connection.

## Docs

- HalloFelix: https://www.hallofelix.de
- MCP server docs: https://github.com/timgutberlet/hallofelix-mcp
- Server URL: https://app.hallofelix.de/api/mcp

Logo is the HalloFelix mark from the publisher's `timgutberlet/hallofelix-mcp` repository. hallofelix.de was unreachable from the build sandbox when this plugin was added, so the submitted logo (https://app.hallofelix.de/apple-icon.png) was not downloaded.

## License

MIT
