# Fiscal.ai

Cursor plugin that connects agents to [Fiscal.ai](https://fiscal.ai) through Fiscal.ai's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Pull as-filed and standardized financial statements, ratios, segments and KPIs, stock prices, SEC filings, insider and institutional ownership, fund letters, funds and ETFs, news, and earnings events for 12,000+ public companies. Filing-backed numbers carry click-through audit links to the exact source page.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Fiscal.ai**.
3. Click **Install**, then complete the Fiscal.ai sign-in prompt in your browser.

Or run `/add-plugin fiscal-ai` in chat.

## MCP

```json
{
  "mcpServers": {
    "fiscal-ai": {
      "type": "http",
      "url": "https://api.fiscal.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with Dynamic Client Registration and PKCE against `api.fiscal.ai`. Cursor registers itself and prompts for Fiscal.ai sign-in when the plugin connects, so there is no API key or client ID to configure. Fiscal.ai also accepts a Fiscal.ai API key as a bearer token (`Authorization: Bearer <key>`) if you'd rather not use OAuth; both paths map to the same account, plan limits, and coverage.

## What agents can do

Fiscal.ai's MCP server is a code-mode server. Instead of one tool per endpoint, it exposes two tools and lets the agent script against the full API:

| Tool | Purpose |
| --- | --- |
| `api_docs` | Returns the API reference, company identifier rules, and `codemode.<name>` helper signatures. Pass `functions` to document only specific helpers. |
| `execute_code` | Runs an `async () => { ... }` JavaScript function in a network-isolated 60-second sandbox with the `codemode` helpers available. Up to six concurrent calls per run; results come back via `console.log()`. |

The `codemode` helpers cover the Fiscal.ai API surface:

| Area | Data |
| --- | --- |
| Companies | Company list and profiles, logos, company identifiers (e.g. `NASDAQ_MSFT`) |
| Financials | Income statement, balance sheet, cash flow (as reported and standardized), standardized metrics, shares outstanding |
| Ratios & adjusted metrics | Company ratios, daily ratios, company-adjusted (non-GAAP) figures |
| Estimates | Agentic consensus, street consensus, analyst ratings |
| Segments & KPIs | Segment revenue and profit splits, operating KPIs |
| Ownership | Insider holders and transactions, institutional holders and holdings |
| Prices & corporate actions | Daily and intraday stock prices, stock splits, dividends |
| Filings & sourcing | Company filings, filing PDFs, filing page images |
| Investor relations | IR events, earnings call transcripts and audio, events calendar |
| News | Company news and summaries, top news |
| Fund letters | Fund letters, investors, and the companies they discuss |
| Funds & ETFs | Fund list, profiles, performance, distributions, holdings, prices |
| Politician trades | Congressional and executive-branch stock trade disclosures |

The hosted runtime is the source of truth for helper names and schemas; call `api_docs` first in a session. The helpers mirror the [Fiscal.ai API](https://docs.fiscal.ai), so its reference documents each endpoint's parameters.

## Notes

- All tools are read-only. The sandbox has no network access beyond the `codemode` helpers, so `execute_code` cannot reach anything outside Fiscal.ai.
- Access follows your Fiscal.ai plan. The free plan connects but is limited to the trial ticker allowlist and free-plan rate limits.
- Fiscal.ai publishes a set of analyst skills (comp sets, valuation, financial models, screeners, etc.) built on this server at https://docs.fiscal.ai/docs/guides/mcp-skills. They can be dropped into a project's `.cursor/skills/` directory.

## Docs

- Fiscal.ai MCP server: https://docs.fiscal.ai/docs/guides/mcp-integration
- Fiscal.ai MCP skills: https://docs.fiscal.ai/docs/guides/mcp-skills
- Fiscal.ai API reference: https://docs.fiscal.ai
- Server URL: https://api.fiscal.ai/mcp

Logo is Fiscal.ai's official app icon, the 512×512 PNG published on docs.fiscal.ai.

## License

MIT
