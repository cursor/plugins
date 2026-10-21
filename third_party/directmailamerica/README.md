# DirectMailAmerica

Cursor plugin that connects agents to [DirectMailAmerica](https://directmailamerica.com) through DirectMailAmerica's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Print and mail USPS letters and postcards, run Email to Letter rules, and track orders.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **DirectMailAmerica**.
3. Click **Install**, then paste your workspace API key into `DIRECTMAILAMERICA_API_KEY`.

Or run `/add-plugin directmailamerica` in chat.

## MCP

```json
{
  "mcpServers": {
    "directmailamerica": {
      "type": "http",
      "url": "https://directmailamerica.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ${DIRECTMAILAMERICA_API_KEY}"
      }
    }
  }
}
```

Auth is a workspace API key the user supplies. Sign in at directmailamerica.com and create a key under **Developers**. `lbl_live_` keys print and mail for real; `lbl_test_` keys never buy postage.

## What agents can do

| Area | Tools |
| --- | --- |
| Quotes and catalog | `get_pricing`, `get_product_catalog`, `quote_product` |
| Mailing (paid, approval required) | `send_letter`, `send_product_quote` |
| Email to Letter | inbox, rules, budgets, letterheads, previews, `approve_email_letter` / `reject_email_letter` |
| Status and balance | `list_jobs`, `get_letter_status`, `get_credits` |

The hosted runtime is the source of truth for tool names and schemas.

## Skills

- `dma-send-mail`: collect addresses, draft, quote, show the preview and total, then mail only after approval.
- `dma-email-to-letter`: manage the inbox and rules, and review and approve pending letters.
- `dma-order-status`: read-only job, tracking and balance checks.

## Notes

- Mailing is real, costs money and cannot be undone. The skills never mail until the user has explicitly approved the exact preview, addresses and price, and they ask again if anything changes.
- Email to Letter rules default to approval mode. Automatic sending needs the user's explicit consent.
- List prices: First-Class letter $1.49 + $0.25 per extra page; Certified Mail $12.99; postcard $1.99.

## Docs

- Agents page: https://directmailamerica.com/agents
- MCP docs: https://directmailamerica.com/docs/mcp
- Server URL: https://directmailamerica.com/api/mcp
- Support: support@directmailamerica.com

Logo is DirectMailAmerica's official mark.

## License

MIT
