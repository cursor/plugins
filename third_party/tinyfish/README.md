# TinyFish

Cursor plugin that connects agents to [TinyFish](https://www.tinyfish.ai) through TinyFish's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Run multi-step web automations from a URL and a natural-language goal, search the web, extract clean content from pages, and open remote stealth browser sessions for direct Playwright, Puppeteer, or Selenium control.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **TinyFish**.
3. Click **Install**, then complete the TinyFish sign-in prompt.

Or run `/add-plugin tinyfish` in chat.

## MCP

```json
{
  "mcpServers": {
    "tinyfish": {
      "type": "http",
      "url": "https://agent.tinyfish.ai/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for TinyFish sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own TinyFish account.

## Before you connect

You need a TinyFish account ([sign up](https://agent.tinyfish.ai/api-keys)). Search and content extraction are free; web automation and browser sessions draw from your TinyFish wallet (plan credits on legacy accounts). See [Rates](https://docs.tinyfish.ai/mcp-integration#rates) for current pricing.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Web automation | `run_web_automation` executes a multi-step task on a site from a URL and a goal (clicking, navigating, forms, logins) and streams progress; `run_web_automation_async` returns a `run_id` for long tasks, with `get_run`, `list_runs`, and `cancel_run` to follow up. Saved Browser Context Profiles (`use_profile`, `profile_id`) reuse login state for recurring authenticated workflows |
| Batch automation | `batch_status` and `batch_cancel` check or cancel up to 8 runs at once |
| Web search | `search` returns structured results with filters for recency, date range, domain type (web, news, research paper), location, language, and domain allow/deny lists; `get_search_usage` lists past searches |
| Content extraction | `fetch_content` renders and extracts clean Markdown, HTML, or JSON from up to 10 URLs per call, with CSS selector scoping and conditional-request support; `list_fetch_usage` lists past fetches |
| Browser sessions | `create_browser_session` opens a remote stealth Chrome session and returns CDP connection details; `list_browser_sessions` and `close_browser_session` manage them |
| Wallet | `get_wallet` reads balance, auto-reload state, and per-product rates (read-only) |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Web automations act on real websites with your saved profiles and credentials when you enable them. Review the goal before letting the agent run tasks that log in, submit forms, or make purchases.
- Sites with bot protection may need the `stealth` browser profile; complex automations can take 30–60 seconds.
- Runs and browser minutes are billed to your TinyFish wallet; `get_wallet` shows the current balance and rates.

## Docs

- MCP integration guide: https://docs.tinyfish.ai/mcp-integration
- Plugins overview: https://docs.tinyfish.ai/plugins
- API reference: https://docs.tinyfish.ai/api-reference
- Server URL: https://agent.tinyfish.ai/mcp

Logo is TinyFish's official mark.

## License

MIT
