# WhatSetter

Cursor plugin that connects agents to [WhatSetter](https://whatsetter.com) through WhatSetter's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

WhatSetter is an AI appointment setter on WhatsApp. Read the inbox and the leads it is working, review meetings it booked, import contacts, pause or resume campaigns, and, with explicit approval, send a WhatsApp message from a connected number.

Official setup: https://docs.whatsetter.com/developers/mcp/

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **WhatSetter**.
3. Click **Install**, then complete the **Connect to WhatSetter** step (below).

Or run `/add-plugin whatsetter` in chat.

## MCP

```json
{
  "mcpServers": {
    "whatsetter": {
      "type": "http",
      "url": "https://mcp.whatsetter.com/mcp"
    }
  }
}
```

Auth is OAuth 2.1 against WhatSetter with Dynamic Client Registration (DCR) and PKCE, discovered from the server's `WWW-Authenticate` header and `/.well-known/oauth-protected-resource`. Cursor registers itself and opens the **Connect to WhatSetter** page on the first tool call: paste a WhatSetter API key there and approve. Cursor only ever holds a revocable token; the key is checked live and stored encrypted on the WhatSetter server. There is no API key or client ID to configure in the plugin.

## Before you connect

You need a WhatSetter workspace at [app.whatsetter.com](https://app.whatsetter.com) and an API key from **Settings → API**. Give the key only the scopes you need; tool calls cannot exceed them.

| Scope | Lets the agent |
| --- | --- |
| `leads:read` / `leads:write` | Read leads / update their status and tags |
| `conversations:read` | Read the inbox and message history |
| `lists:read` / `lists:write` | List and create contact lists, import contacts |
| `campaigns:read` / `campaigns:write` | List campaigns / pause and resume them |
| `messages:send` | Send WhatsApp messages from a connected number |
| `bookings:read` | Read booked meetings |
| `groups:read` | Read managed WhatsApp groups: members, messages, joins and leaves |
| `webhooks:manage` | Create, delete, and test webhooks |

A good first key for a daily briefing: `leads:read`, `conversations:read`, `campaigns:read`, `bookings:read`. Add `messages:send` only if the agent may reply on your behalf.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Identity | `whoami`: the workspace and the scopes of the key, to start every session |
| Leads | List and search leads, read one lead with its qualification, update status and tags |
| Conversations | List conversations and read the full message history of a lead |
| Messaging | Send a WhatsApp message to a lead the setter has already contacted |
| Lists | List and create contact lists, import contacts (first contact is then made by the campaign, at a safe pace) |
| Campaigns | List campaigns, pause and resume them |
| Bookings | List the meetings booked by the setter, per campaign |
| Groups | List managed WhatsApp groups, their members, messages, joins and leaves |
| Webhooks | List, create, delete, and test webhooks (for example on `lead.qualified`) |

The hosted server is the source of truth for tool names and schemas. The bundled `whatsetter` skill teaches the agent how to combine the tools and when to stop and ask.

## Notes

- Every tool carries `readOnlyHint` / `destructiveHint` annotations, so Cursor can auto-approve reads and always prompts on writes. `send_whatsapp_message` is the only tool that reaches a real person; the skill has the agent show the recipient and the exact text and wait for confirmation.
- Anti-ban rules are enforced by the WhatSetter API, not by a prompt: a number that was never contacted cannot be messaged cold (`lead_not_contacted`), each WhatsApp number has a daily message budget (`quota_exceeded`), and every send carries an idempotency key.
- A message sent through the plugin does not pause the AI setter: it keeps answering the lead and sees the message in the history.
- Sending messages and running campaigns need at least one WhatsApp number connected in the workspace.

## Docs

- WhatSetter MCP guide: https://docs.whatsetter.com/developers/mcp/
- API keys and scopes: https://docs.whatsetter.com/developers/authentication/
- Anti-ban protections: https://docs.whatsetter.com/dashboard/anti-ban/
- Upstream plugin repository (Grok CLI and Claude Code manifests): https://github.com/whatsetter/whatsetter-plugin
- Server URL: https://mcp.whatsetter.com/mcp

Logo is WhatSetter's brand mark on a white tile.

## License

MIT
