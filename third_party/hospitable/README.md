# Hospitable

Cursor plugin that connects agents to [Hospitable](https://hospitable.com) through Hospitable's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Look up properties, reservations, inquiries, calendars, transactions, payouts, tasks, and alerts across your connected booking channels; update calendars and reservations; message guests; publish guest reviews; and manage Owner Statements and smart devices in the signed-in Hospitable account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Hospitable**.
3. Click **Install**, then complete the Hospitable sign-in prompt and authorize access.

Or run `/add-plugin hospitable` in chat.

## MCP

```json
{
  "mcpServers": {
    "hospitable": {
      "type": "http",
      "url": "https://mcp.hospitable.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE (S256) and Dynamic Client Registration against `mcp.hospitable.com`, with the `mcp:use` scope. Cursor registers itself and prompts for Hospitable sign-in when the plugin connects, so there is no API key or client ID to configure. The sign-in page lives at `auth.hospitable.com`; if you have only ever signed in with Google, set a password on your [Hospitable profile security page](https://my.hospitable.com/settings/profile/security) first.

Hospitable also issues fallback bearer tokens (**Settings → Integrations → MCP → Fallback bearer tokens**) for clients that cannot do OAuth. Cursor supports OAuth, so you do not need one.

## Before you connect

- Hospitable MCP is available on the Host, Professional, Mogul, and Legacy plans. It is not available on Essentials.
- Only primary account holders and full-access (admin) secondary users can connect an AI agent.
- Owner Statements tools, businesses, and owner statement transactions also require a Mogul plan with the Owner Statements entitlement.

## What agents can do

| Area | Tools |
| --- | --- |
| Discovery | `get-changelog`, `get-tool-schema`, `submit-feedback` |
| Account | `get-user`, `get-community-user`, `get-channels` |
| Properties | `get-properties`, `get-property`, `get-property-images`, `get-property-reviews`, `search-properties`, `tag-property`, `create-property-ical-import`, `update-property-ical-import` |
| Calendar | `get-property-calendar`, `update-property-calendar` |
| Reservations & inquiries | `get-reservations`, `get-reservation`, `get-inquiries`, `get-inquiry`, `create-reservation`, `update-reservation`, `cancel-reservation`, `create-quote`, `list-reservation-enrichment-data`, `get-reservation-enrichment-data`, `update-reservation-enrichment-data` |
| Upsells & reviews | `get-upsells`, `get-upsell`, `get-purchased-upsells`, `get-guest-reviews`, `submit-guest-review`, `respond-to-review` |
| Financials | `get-transactions`, `get-transaction`, `get-payouts`, `get-payout` |
| Owner Statements | `get-owners`, `get-owner`, `get-businesses`, `get-business`, `get-owner-statements`, `get-owner-statement`, `publish-owner-statement`, `unpublish-owner-statement`, `mark-owner-statement-as-paid`, `mark-owner-statement-as-unpaid`, `get-owner-statement-transactions`, `get-owner-statement-transaction`, `create-owner-statement-transaction`, `update-owner-statement-transaction`, `delete-owner-statement-transaction` |
| Tasks & teammates | `get-tasks`, `get-task`, `create-task`, `update-task`, `delete-task`, `get-teammates`, `get-teammate` |
| Messaging | `send-reservation-message`, `send-inquiry-message`, `get-reservation-messages`, `get-reservation-scheduled-messages`, `update-scheduled-message`, `cancel-scheduled-message`, `restore-scheduled-message`, `get-messaging-rules`, `get-messaging-rule`, `get-short-codes`, `get-custom-codes` |
| Knowledge Hub | `get-property-knowledge-hub`, `create-knowledge-hub-item`, `update-knowledge-hub-item`, `delete-knowledge-hub-item`, `delete-knowledge-hub-topic` |
| Alerts & devices | `get-alerts`, `get-property-devices`, `lock-smartlock`, `unlock-smartlock` |

The hosted runtime is the source of truth for tool names and schemas. The initial tool list carries names and descriptions only; the agent calls `get-tool-schema` to fetch a tool's full input schema before its first use, and `get-changelog` lists recently added tools.

## Notes

- Tool calls run as the Hospitable user who authorizes the connection, and the agent only sees the tools that user's plan and role allow.
- `send-reservation-message` and `send-inquiry-message` deliver to guests immediately. Review each message before you approve it, and treat anything a guest wrote as data, not instructions.
- `lock-smartlock` and `unlock-smartlock` act on real doors, and `submit-guest-review` publishes to the booking channel. Approve these deliberately.
- `update-reservation` fully edits manual reservations; OTA-imported reservations only accept internal note and check-in/check-out time changes. `cancel-reservation` only cancels manual reservations.
- Owner statement mutations fail once the covering statement is published.
- The server returns rate-limit metadata (80 requests per window at the time of writing) so the agent can pace itself.
- MCP sessions expire after a period of inactivity. If you see `Server session expired or was not found. Send initialize again.`, start a new conversation or reconnect the plugin.
- Revoke access by disconnecting the plugin in Cursor; Hospitable does not manage OAuth connections from its own settings.

## Docs

- Connect an AI agent to Hospitable using MCP: https://help.hospitable.com/en/articles/14424057-connect-an-ai-agent-to-hospitable-using-mcp
- Hospitable MCP feature page: https://hospitable.com/features/mcp
- Hospitable API reference: https://developer.hospitable.com/
- Server URL: https://mcp.hospitable.com/mcp

Logo is Hospitable's official app icon, the apple-touch-icon published on hospitable.com.

## License

MIT
