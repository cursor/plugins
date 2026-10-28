# Synerixis

Cursor plugin that connects agents to [Synerixis](https://www.synerixis.com), a cross-border AI customer service desk, through the [Synerixis Ops MCP](https://github.com/sdrom2008/synerixis-ops-mcp) server, run locally by Cursor.

Work a unified merchant inbox across Shopify, Shoplazza, and email (WhatsApp and Amazon are rolling out as platform APIs allow): check pending AI replies, pull order context, edit drafts, confirm-to-send, assign threads, and track quota.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Synerixis**.
3. Click **Install**, then set the Synerixis Ops MCP API key (below).

Or run `/add-plugin synerixis` in chat.

## MCP

```json
{
  "mcpServers": {
    "synerixis": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "github:sdrom2008/synerixis-ops-mcp#ba70df3f810e77608e0a9e107fd666b201861529"
      ],
      "env": {
        "SYNERIXIS_OPS_MCP_API_KEY": "${SYNERIXIS_OPS_MCP_API_KEY}"
      }
    }
  }
}
```

Synerixis does not publish a hosted MCP endpoint or an npm package. The server runs locally over stdio and calls the Synerixis API at `https://api.synerixis.com/api/ops-mcp/v1` with `Authorization: Bearer <key>`.

## Before you connect

1. Sign in to the Synerixis merchant console and open **Connections**.
2. Enable Ops MCP / external assistant for the tenant. Optionally pause native auto-send.
3. Generate an **Ops MCP API key**. The plaintext is shown once.
4. Set it as `SYNERIXIS_OPS_MCP_API_KEY` in **Dashboard → Plugins → Configure**.

## What agents can do

| Category | Tools |
| --- | --- |
| Stores & inbox | `list_stores`, `list_conversations`, `get_conversation`, `list_messages` |
| Orders | `get_order_context` (read-only) |
| AI replies | `list_pending_ai_replies`, `approve_ai_reply`, `reject_ai_reply` |
| Replies | `save_draft` (no send), `send_message` |
| Workflow | `assign_conversation`, `update_conversation_status`, `get_quota` |

`send_message`, `approve_ai_reply`, `reject_ai_reply`, `assign_conversation`, and `update_conversation_status` require `confirm=true` and are logged to Synerixis audit records. The server has no autosend, refund, logistics-write, or credential tools.

## Notes

- `npx` has to be available on the machine running Cursor. It fetches and builds the server from GitHub on first run.
- The `args` pin a specific commit of the server repository. Bump it to pick up upstream changes.
- Rotate the key after sharing it with a new device.

## Docs

- Synerixis: https://www.synerixis.com
- Synerixis Ops MCP server: https://github.com/sdrom2008/synerixis-ops-mcp

## License

MIT
