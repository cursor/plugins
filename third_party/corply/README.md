# Corply

Cursor plugin that connects agents to [Corply](https://corply.dev) through Corply's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Incorporate and run Delaware C-corps from chat. Check name availability, form a company (charter, bylaws, board consents, EIN), issue founder stock with 83(b) filings, keep the cap table and stock ledger, raise on YC SAFEs, run board and stockholder consents, track Delaware annual reports and filing deadlines, and send or collect payments, with documents signed and filed through Corply.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Corply**.
3. Click **Install**, then complete the Corply sign-in prompt.

Or run `/add-plugin corply` in chat.

## MCP

```json
{
  "mcpServers": {
    "corply": {
      "type": "http",
      "url": "https://corply.dev/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with dynamic client registration, so Cursor prompts for Corply sign-in when the plugin connects. Sign in with your email and the one-time code Corply sends; there is no API key to configure.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Formation | Check Delaware name availability, draft and form a company (charter, bylaws, board consents, EIN) |
| Equity | Issue founder stock with 83(b) filings, keep the cap table and stock ledger, raise on YC SAFEs |
| Governance | Run board and stockholder consents |
| Compliance | Track Delaware annual reports and filing deadlines |
| Payments | Send or collect payments |

Name checks and company drafts create no filings or charges. Nothing is filed or billed without explicit founder checkout, and Delaware filings and anything requiring a licensed professional stay human-reviewed. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Corply is software, not a law firm, and does not provide legal, tax, or accounting advice.
- Never paste passwords, access tokens, government identifiers, or payment credentials into chat.

## Docs

- Corply: https://corply.dev
- Server URL: https://corply.dev/mcp
- Setup: https://corply.dev/setup
- Privacy: https://corply.dev/privacy
- Terms: https://corply.dev/terms
- Support: https://corply.dev/support

Logo is the brand mark from Corply's own plugin repository ([corply-dev/corply-plugin](https://github.com/corply-dev/corply-plugin)). corply.dev was unreachable when this plugin was added, so the file was not downloaded from the website.

## License

MIT
