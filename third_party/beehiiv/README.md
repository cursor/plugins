# beehiiv

Cursor plugin that connects agents to [beehiiv](https://www.beehiiv.com) through beehiiv's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Draft and edit newsletter posts in your own voice, organize subscribers with tags, custom fields, and segments, build automation workflows, and pull publication, post, podcast, and website performance into chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **beehiiv**.
3. Click **Install**, then complete the beehiiv sign-in prompt.

Or run `/add-plugin beehiiv` in chat.

## MCP

```json
{
  "mcpServers": {
    "beehiiv": {
      "type": "http",
      "url": "https://mcp.beehiiv.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for beehiiv sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own beehiiv account, and the connection inherits that user's workspace role and permissions.

## Before you connect

You need a beehiiv account ([sign up](https://www.beehiiv.com)). The MCP is available on every plan: free plans get read-only access, and write actions — creating and editing posts, managing segments, building automations — require a [paid beehiiv plan](https://www.beehiiv.com/pricing). Each connection is tied to one workspace; to work across several workspaces, add the server again with a distinct query string such as `https://mcp.beehiiv.com/mcp?account=2` and sign each one into a different account.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Content and posts | Create and edit post drafts, manage post templates and content tags, and read past posts and their content to match tone and structure |
| Audience and subscribers | Look up subscribers and their engagement, create and manage subscriber tags and custom fields, build segments and condition sets, and set up surveys and polls |
| Growth and acquisition | Manage signup flows, subscribe forms and form themes, and view, discover, and manage recommendations |
| Monetization | View ad network opportunities and offers and direct sponsorship agreements (read-only), manage paid products and tiers, and view paywalls |
| Automations | Build and configure automation workflows and the emails inside them |
| Podcasts | View show and episode data, episode stats, and transcripts |
| Website | Edit page metadata such as SEO titles and descriptions, manage redirects, and view website analytics |
| Analytics | Publication, post, and website performance: subscriber growth, opens, clicks, deliveries, and traffic breakdowns |
| Other | Upload and manage image assets, manage guest authors, and manage external RSS feeds |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Write actions change your live workspace: editing a draft, tagging subscribers, saving a segment, or changing a product tier takes effect immediately for your real audience. Confirm what the agent is about to change before it runs.
- Publishing, scheduling, and sending posts are not available through the MCP and must be done in the beehiiv app; the agent can prepare a draft but cannot send it. Automations built via the MCP likewise stay inactive until you activate them in the app.
- beehiiv evolves MCP tools continuously and does not version them. If new tools do not appear, disconnect and reconnect the plugin.

## Docs

- Getting started with the beehiiv MCP: https://www.beehiiv.com/support/article/39255979546263-getting-started-with-the-beehiiv-mcp
- What you can do with the beehiiv MCP: https://www.beehiiv.com/support/article/41262491804439-what-you-can-do-with-the-beehiiv-mcp
- MCP overview: https://www.beehiiv.com/features/mcp
- API reference: https://developers.beehiiv.com
- Server URL: https://mcp.beehiiv.com/mcp

Logo is beehiiv's official mark.

## License

MIT
