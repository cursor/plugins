# DirectMailAmerica

Cursor plugin that connects agents to [DirectMailAmerica](https://directmailamerica.com) through DirectMailAmerica's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Print and mail USPS letters, Certified Mail and single- or double-sided postcards, run Email to Letter and Email to Postcard, and track orders.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **DirectMailAmerica**.
3. Click **Install**, then connect your DirectMailAmerica workspace when prompted (OAuth).

Or run `/add-plugin directmailamerica` in chat.

## MCP

```json
{
  "mcpServers": {
    "directmailamerica": {
      "type": "http",
      "url": "https://directmailamerica.com/api/mcp"
    }
  }
}
```

Auth uses DirectMailAmerica's OAuth Connect flow, which grants scoped read, write, paid-send and admin permissions. Call `get_connection_status` to see the connected workspace, environment and permissions. Staging (`lbl_test_`) workspaces never buy postage.

## What agents can do

| Area | Tools |
| --- | --- |
| Quotes, previews and catalog | `get_pricing`, `get_product_catalog`, `preview_letter`, `quote_product`, `get_product_quote`, `preview_product_quote` |
| Mailing (paid, approval required) | `send_letter`, `send_product_quote` |
| Addresses, cover sheets, artwork | `list_addresses`, `save_address`, `validate_address`, cover sheet tools, `generate_postcard_artwork`, `convert_postcard_image` |
| Email to Letter | inbox, rules, budgets, letterheads, previews, `approve_email_letter` / `reject_email_letter` |
| Email to Postcard | postcard inbox, rules, artwork, `quote_email_postcard`, `get_email_postcard_quote` |
| Status and billing | `list_jobs`, `get_job_details`, `get_letter_status`, `download_job_document`, `get_credits`, `get_billing_history` |
| Workspace | `get_workspace_settings`, webhook settings (secrets are never returned over MCP) |

The hosted runtime is the source of truth for tool names and schemas.

## Skills

- `dma-send-mail`: collect addresses, draft, quote, show the preview and total, then mail only after approval.
- `dma-email-to-letter`: manage the inbox and rules, and review and approve pending letters.
- `dma-email-to-postcard`: manage the postcard inbox and rules, and review, quote and approve pending postcards.
- `dma-order-status`: read-only job, tracking, document, billing and balance checks.

## Notes

- Mailing is real, costs money and cannot be undone. The skills never mail until the user has explicitly approved the exact preview, addresses and price, and they ask again if anything changes.
- Email to Letter and Email to Postcard rules default to approval mode. Automatic sending needs the user's explicit consent.
- List prices: First-Class letter $1.49 + $0.25 per extra page; Certified Mail $12.99; small postcard $1.99; double-sided postcards and other products use exact saved quotes.

## Docs

- Agents page: https://directmailamerica.com/agents
- MCP docs: https://directmailamerica.com/docs/mcp
- Server URL: https://directmailamerica.com/api/mcp
- Support: support@directmailamerica.com

Logo is DirectMailAmerica's official mark.

## License

MIT
