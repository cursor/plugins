# Lazyweb

Cursor plugin that connects agents to [Lazyweb](https://www.lazyweb.com) through Lazyweb's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ground UI and product work in real evidence: search 281k+ real app screens and product flows, 20,000+ mobile A/B tests with outcomes, and generate growth reports, mockups, and website growth scores — without leaving the editor.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Lazyweb**.
3. Click **Install**, then connect your account (below).

Or run `/add-plugin lazyweb` in chat.

## MCP

```json
{
  "mcpServers": {
    "lazyweb": {
      "type": "http",
      "url": "https://www.lazyweb.com/mcp"
    }
  }
}
```

Auth is **OAuth 2.1** — no API key. On first connect Cursor opens a browser once to sign you in (the server advertises OAuth via RFC 9728 protected-resource metadata and RFC 8414 authorization-server metadata, with PKCE and Dynamic Client Registration). Free accounts get started instantly; paid plans unlock the full toolkit.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Product references | Search real app screens, complete product flows (onboarding, checkout, paywall, signup), and mobile A/B tests / experiments with outcomes; browse by company and category; find visually similar screens |
| Design & critique | Generate mockups from a screenshot, compare a design against real examples, and get UI-change proposals with hosted review |
| Growth | Generate full growth reports, score a website's growth readiness, and manage a product-scoped growth backlog |
| Research | Retrieve and synthesize real paywalls and best practices for pricing, onboarding, and monetization decisions |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The connection is a standard remote MCP over streamable HTTP; Cursor connects directly and runs the OAuth flow — no `npx mcp-remote` shim needed.
- Every successful action returns a stable resource link the agent can open or share.
- Tool calls run with the permissions and plan of the connected account.

## Docs

- Cursor setup: https://www.lazyweb.com/cursor.md
- Connect any agent: https://www.lazyweb.com/connect
- MCP endpoint: https://www.lazyweb.com/mcp
- Plans: https://www.lazyweb.com/plans

Logo is Lazyweb's official mark.

## License

MIT
