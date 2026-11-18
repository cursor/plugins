# Expensify

Grok Bot plugin that connects agents to [Expensify](https://www.expensify.com) through Expensify's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Ask about your expenses, expense reports, receipts, and invoices in plain language: what you spent on travel this month, which expenses are missing receipts, or which of your team's reports are waiting on you. Access is read-only.

## Install

In Grok Bot, open **Settings → Plugins**, install **Expensify**, and complete the Expensify sign-in.

## MCP

```json
{
  "mcpServers": {
    "expensify": {
      "type": "http",
      "url": "https://www.expensify.com/mcp",
      "placement": "server"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE against `https://www.expensify.com`, with dynamic client registration. There is no API key or client ID to configure, and each user signs in with their own Expensify account on Expensify's consent screen.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

## What agents can do

Expensify exposes one read-only **Search** tool, scoped to the permissions your Expensify account already has. It covers expenses, expense reports, receipts, invoices, trips, and tasks, including categories and approval states.

The hosted server is the source of truth for tool names and schemas.

## What you share

Signing in grants the `mcp:tools` scope. Grok can read the same Expensify data you can see in the app, including other people's reports when you approve or administer them. It cannot submit, approve, or edit expenses, lock cards, or move money.

## Revoke anytime

Disconnect the plugin in Grok Bot, or revoke Grok's access in Expensify.

## Availability

- Grok Bot only. The plugin is hidden in Cursor.
- Any Expensify account works; no admin seat or contract is needed.

## Docs

- Announcement and setup guides: https://use.expensify.com/blog/expensify-mcp
- Server URL: https://www.expensify.com/mcp

Logo is Expensify's official app icon, rendered from the SVG published on new.expensify.com.

## License

MIT
