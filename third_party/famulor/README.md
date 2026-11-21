# Famulor

Cursor plugin that connects agents to [Famulor](https://www.famulor.io) through Famulor's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Famulor builds AI assistants for phone calls, websites, and messaging. Build and review voice assistants, start and analyze calls, run outbound campaigns, manage knowledge bases, and work with WhatsApp and webchat conversations in a Famulor workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Famulor**.
3. Click **Install**, then set your Famulor API key (below).

Or run `/add-plugin famulor` in chat.

## MCP

```json
{
  "mcpServers": {
    "famulor": {
      "type": "http",
      "url": "https://app.famulor.io/mcp",
      "headers": {
        "Authorization": "Bearer ${FAMULOR_API_KEY}"
      }
    }
  }
}
```

Auth is a Famulor workspace **API key** sent as a Bearer token. Create one in [app.famulor.io](https://app.famulor.io) under **Settings → API & MCP → Create a new API key**, then set it in **Dashboard → Plugins → Configure**. Keys start with `fam_`. Do not commit the key.

Famulor documents the same header for manual and server-to-server MCP connections: `Authorization: Bearer fam_...`. See https://docs.famulor.io/mcp/overview.

## Before you connect

You need a Famulor account on a plan that includes **Connect AI / MCP**. Tool calls run in the workspace the key belongs to, with that key's scopes and your workspace role.

## What agents can do

The server groups its tools into toolsets. The tools available depend on your plan, role, and the key's scopes.

| Toolset | Capabilities |
| --- | --- |
| `assistants` | Assistants, versions, voices, reusable tools, bookings, and simulations |
| `calls` | Calls, conversation history, transcripts, and permitted call actions |
| `campaigns` | Campaigns, audiences, leads, suppression, and CRM sync |
| `messaging` | WhatsApp, webchat, and email connectors, templates, and conversations |
| `telephony` | Phone numbers, SIP trunks, and caller-ID verification |
| `knowledge` | Knowledge bases, documents, and website imports |
| `dashboards` | Analytics dashboards and widgets |
| `automations` | Automations, connections, and run history |
| `billing` | Balance, usage, and transactions |
| `settings` | Workspace settings, domains, and retention |
| `tasks` | Long-running exports, crawls, simulations, and campaign preparation |

Call `list_mcp_toolsets` to see the groups available to your key. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server can write as well as read, including starting outbound calls and campaigns that reach real phone numbers and use workspace balance. Use a key with the narrowest scopes you need, and test on a non-production workspace first.
- To expose fewer tools, add `?toolsets=assistants,calls` to the URL or send an `X-MCP-Toolsets` header. Filters narrow a key's access; they cannot add permissions.
- Requests are rate-limited to 120 per minute per credential and 600 per minute per workspace.
- White-label workspaces use their own domain: replace `app.famulor.io` with that domain.
- Do not commit `FAMULOR_API_KEY`.

## Docs

- Famulor: https://www.famulor.io
- Connect an AI client: https://docs.famulor.io/mcp/overview
- Tools and scopes: https://docs.famulor.io/mcp/tools-and-scopes
- Server URL: https://app.famulor.io/mcp

Logo is Famulor's official cyan toggle mark, from `https://www.famulor.io/images/famulor-fav.png`.

## License

MIT
