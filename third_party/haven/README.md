# Book With Haven

Cursor plugin that connects agents to [Book With Haven](https://www.bookwithhaven.com) through Haven's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run your Haven vacation rentals from chat: check bookings and the calendar, block dates, set rates and stay rules, and read and reply to guest messages on your own account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Book With Haven**.
3. Click **Install**, then sign in to Haven and click **Allow access** on Haven's consent screen.

Or run `/add-plugin haven` in chat.

## MCP

```json
{
  "mcpServers": {
    "haven": {
      "type": "http",
      "url": "https://www.bookwithhaven.com/api/public/mcp"
    }
  }
}
```

Auth is OAuth: Cursor prompts for Haven sign-in when the plugin connects.

## Before you connect

You need a Book With Haven account. A free account works.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Bookings | List and inspect bookings |
| Calendar | View availability and block dates |
| Pricing | Set rates and stay rules |
| Guests | Read and reply to guest messages |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Every action runs under your Haven role, so a Viewer connects read-only.
- The server never moves money: it cannot approve, cancel, refund, or reprice a booking.

## Docs

- Book With Haven: https://www.bookwithhaven.com
- Server URL: https://www.bookwithhaven.com/api/public/mcp

The logo is not committed yet. bookwithhaven.com blocked automated requests when this plugin was added, and Haven has no GitHub organization, so `plugin.json` points at the submitted `https://www.bookwithhaven.com/favicon.svg`.

## License

MIT
