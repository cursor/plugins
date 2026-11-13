# Rillet

Cursor plugin that connects agents to [Rillet](https://www.rillet.com) through Rillet's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask questions of your live general ledger, pull financial statements, and create or update customers, vendors, invoices, bills, contracts, and credit memos in Rillet.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Rillet**.
3. Click **Install**, then complete the Rillet sign-in prompt: pick your organization and click **Allow access**.

Or run `/add-plugin rillet` in chat.

## MCP

```json
{
  "mcpServers": {
    "rillet": {
      "type": "http",
      "url": "https://api.rillet.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with Dynamic Client Registration and PKCE against `api.rillet.com`, with the `read` and `write` scopes. Cursor registers itself and prompts for Rillet sign-in when the plugin connects, so there is no API key or client ID to configure. Rillet also accepts a Rillet API key as a bearer token if you'd rather not use OAuth.

## What agents can do

| Area | Tools |
| --- | --- |
| Reports | `retrieve_balance_sheet_report`, `retrieve_income_statement_report`, `retrieve_cash_flow_statement_report`, `retrieve_trial_balance_report`, `retrieve_executive_pl_report`, `retrieve_waterfall_report` |
| General ledger | `list_all_accounts`, `list_all_journal_entries` |
| Customers & vendors | `list_all_customers`, `retrieve_a_customer`, `create_a_customer`, `update_a_customer`, `delete_a_customer`, and the matching `*_a_vendor` tools |
| Invoices & payments | `list_all_invoices`, `create_an_invoice`, `update_an_invoice`, `delete_an_invoice`, `update_taxes_for_an_invoice`, `update_invoice_sent_status`, `list_all_invoice_payments`, `create_an_invoice_payment`, `setup_auto_payment`, `get_payment_method` |
| Bills & payables | `list_all_bills`, `retrieve_a_bill`, `create_a_bill`, `update_a_bill`, `delete_a_bill`, `list_bill_payments`, `create_a_bill_payment`, `delete_a_bill_payment` |
| Contracts & usage | `list_all_contracts`, `retrieve_a_contract`, `create_a_contract`, `update_a_contract`, `delete_a_contract`, `preview_contract_amendment`, `amend_a_contract`, `end_an_open_ended_contract`, `list_all_contract_item_usage_records`, `upsert_a_usage_record`, `delete_a_usage_record` |
| Credits | `*_a_credit_memo` and `update_taxes_for_a_credit_memo`, `*_a_vendor_credit` and `apply_vendor_credit` |
| Products & charges | `list_all_products`, `retrieve_a_product`, `create_a_product`, `update_a_product`, `delete_a_product`, `list_all_charges`, `retrieve_a_charge`, `delete_a_charge` |
| Custom fields | `get_fields`, `create_field`, `update_field`, `create_field_value`, `update_field_value`, `delete_field_value` |
| Organization | `retrieve_an_organization`, `list_all_subsidiaries`, `retrieve_a_subsidiary`, `list_all_reimbursements`, `retrieve_a_reimbursement`, `delete_a_reimbursement`, `get_api_key_information` |

The hosted runtime is the source of truth for tool names and schemas. The tools mirror the [Rillet Public API](https://docs.api.rillet.com), so its reference documents each tool's parameters.

## Notes

- Tool calls run as the Rillet user who authorizes the connection, and the agent only sees the tools that user's Rillet role allows.
- Reports and lists read your live books, not a nightly sync.
- Writes land in your general ledger. Create, update, and delete tools cover customers, vendors, invoices, bills, payments, contracts, and credits. Approve each write deliberately, and treat deletes as irreversible.
- If you belong to more than one Rillet organization, you pick which one to connect during sign-in.
- Rillet only accepts HTTPS or localhost OAuth redirect URIs. If sign-in fails with `Redirect URIs must use HTTPS (localhost is exempt)`, your Cursor client registered its `cursor://` callback. The Cursor CLI's `agent mcp login` does this as of version 2026.08.04.

## Docs

- Rillet MCP server: https://docs.api.rillet.com/docs/mcp
- Rillet Public API reference: https://docs.api.rillet.com
- Server URL: https://api.rillet.com/mcp
- Support: mcp-support@rillet.com

Logo is Rillet's official app icon, the web clip published on rillet.com.

## License

MIT
