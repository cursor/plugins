# Mixpanel

Cursor plugin that connects agents to [Mixpanel](https://mixpanel.com) through Mixpanel's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query events, funnels, flows, retention, and session replays, and manage dashboards, Lexicon, cohorts, experiments, and feature flags from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Mixpanel**.
3. Click **Install**, choose your Mixpanel region, then complete the Mixpanel sign-in prompt.

Or run `/add-plugin mixpanel` in chat.

In Grok Bot, the region is asked when you sign in, the same way Zoho asks for its data center. In Cursor, the region is the plugin's **Mixpanel region** setup value.

## MCP

Mixpanel hosts a separate MCP server per data region. The plugin ships one server whose host is the region you choose:

```json
{
  "mcpServers": {
    "mixpanel": {
      "type": "http",
      "url": "https://${MIXPANEL_MCP_HOST}/mcp",
      "placement": "server"
    }
  }
}
```

| Mixpanel region | `MIXPANEL_MCP_HOST` | URL |
| --- | --- | --- |
| United States | `mcp.mixpanel.com` | `https://mcp.mixpanel.com/mcp` |
| Europe | `mcp-eu.mixpanel.com` | `https://mcp-eu.mixpanel.com/mcp` |
| India | `mcp-in.mixpanel.com` | `https://mcp-in.mixpanel.com/mcp` |

`MIXPANEL_MCP_HOST` is declared in `plugin.json` as an enum of those three hosts, so no other host can be stored. Grok Bot's region picker lists the same three regions; keep the two in sync if Mixpanel adds one.

Auth is OAuth. Mixpanel uses the authorization code flow with PKCE (S256) and dynamic client registration, so there is no API key or client ID to configure. Each regional server publishes its own authorization server. Cursor or Grok Bot prompts for Mixpanel sign-in when the plugin connects. Each user signs in with their own Mixpanel account, and tool calls cannot exceed that user's project permissions.

`"placement": "server"` makes Grok Bot dial the server through the hosted MCP path.

Pick the region your Mixpanel organization lives in. A project in Europe is not on the US server. Switching regions needs a new sign-in, because each region keeps its own.

## Before you connect

You need a Mixpanel account with access to the project you want to query.

- **New free and growth accounts created after August 1, 2026:** MCP is on by default. An organization admin can turn it off under **Settings → Org → AI Settings**.
- **Every other account:** an organization admin must enable MCP under **Settings → Org → AI Settings** before anyone can connect. The change can take up to 15 minutes.

Free plans can be subject to Query API access limits. See [Mixpanel pricing](https://mixpanel.com/pricing/).

## What agents can do

| Category | Capabilities |
| --- | --- |
| Analytics | Run insights, funnels, flows, and retention queries; read a saved report; show a chart for a query already run |
| Dashboards | List, get, create, update, duplicate, and delete boards |
| Discovery | List organizations and projects; browse events, properties, and property values; search entities; read data-quality issues and Lexicon links; read business context |
| Data management | Edit event and property metadata, manage tags, dismiss data-quality issues, update business context, and find or merge duplicate names |
| Cohorts, metrics, and definitions | Create, read, and update cohorts, saved metrics, lookup tables, and custom properties |
| Session replays | Analyze one user's replays alongside their event data |
| Experiments and feature flags | List, get, create, and update experiments and feature flags, with setup and results guidance. These tools are in beta. Audience targeting, including cohort-based targeting, is not available through MCP |
| Audit log | Read who changed what, and when |

The hosted runtime is the source of truth for tool names and schemas. See the [Mixpanel MCP docs](https://docs.mixpanel.com/docs/mcp) for the current tool list.

## Notes

- Version 1.0.0 always used the US server. After updating, choose your region and sign in again. Pick **United States** to keep a US organization.
- Many tools write to the project: dashboards, Lexicon entries, cohorts, metrics, experiments, and feature flags. Confirm the project and the change before letting the agent write.
- If Verified Mode is on, query results still include unverified entities. They are flagged, and results prefer a verified equivalent when one exists.
- Mixpanel also offers service-account authentication (beta) for headless clients. This plugin packages only the OAuth endpoint and does not send a service-account header.
- Revoke access from the Mixpanel account's authorized applications, or disconnect the plugin.

## Docs

- Mixpanel MCP server: https://docs.mixpanel.com/docs/mcp
- Server URLs: `https://mcp.mixpanel.com/mcp` (United States), `https://mcp-eu.mixpanel.com/mcp` (Europe), `https://mcp-in.mixpanel.com/mcp` (India)

Logo is Mixpanel's official mark, from the favicon published on mixpanel.com, placed on the dark tile used by mixpanel.com's apple-touch icon.

## License

MIT
