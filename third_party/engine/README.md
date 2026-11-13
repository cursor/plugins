# Engine

Cursor plugin that connects agents to [Engine](https://engine.com) through Engine's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find hotels near a place, compare live room rates and refund terms, book with a saved card or your company's direct bill, shorten or cancel a stay, change guest names, and check your support cases.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Engine**.
3. Click **Install**, then complete the Engine sign-in prompt.

Or run `/add-plugin engine` in chat.

## MCP

```json
{
  "mcpServers": {
    "engine": {
      "type": "http",
      "url": "https://mcp.engine.com/mcp"
    }
  }
}
```

Auth is OAuth with PKCE through Engine sign-in at `login.engine.com`, with the `mcp:invoke` scope. Each user signs in with their own Engine account, and bookings are made only for that member.

## What agents can do

| Area | Tools |
| --- | --- |
| Hotel search | `lodging_resolve_destination`, `lodging_search_hotels`, `lodging_get_room_rates` |
| Booking | `lodging_create_cart`, `lodging_list_payment_methods`, `lodging_book_cart`, `lodging_get_booking_status` |
| Trip changes | `lodging_get_booking`, `lodging_preview_cancellation`, `lodging_submit_cancellation`, `lodging_preview_shortening`, `lodging_submit_shortening`, `lodging_submit_guest_name_change` |
| Support | `support_list_cases`, `support_get_case`, `support_get_case_status`, `support_search_help_center` |
| Account | `lodging_get_current_user` |

The hosted runtime is the source of truth for tool names and schemas. Engine publishes the full tool reference at https://mcp.engine.com/docs/cursor/.

## Notes

- Booking charges a saved card (including Engine X) or your company's direct bill. Engine's tools show the total and cancellation terms and ask for your yes before booking. Approve each booking deliberately.
- Cancelling or shortening a stay is priced as a preview first, and the refund is issued only when you confirm.
- When a booking can't be confirmed, the tools return links to finish or check it in the Engine web app.
- The server covers hotels only. Flights and rental cars booked through Engine aren't available here.

## Docs

- Engine MCP tool reference: https://mcp.engine.com/docs/
- Server URL: https://mcp.engine.com/mcp

Logo is Engine's official app icon, the 256×256 web clip published on engine.com.

## License

MIT
