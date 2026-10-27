# Mailtea

Cursor plugin that connects agents to [Mailtea](https://mailtea.app) through Mailtea's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server, plus skills for email and website design.

Send and schedule transactional email and check delivery, draft newsletters and send a test copy, then send or schedule to an audience, manage contacts and segments, build automations, and edit your publication's website.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Mailtea**.
3. Click **Install**, then complete the Mailtea sign-in prompt.

Or run `/add-plugin mailtea` in chat.

## MCP

```json
{
  "mcpServers": {
    "mailtea": {
      "type": "http",
      "url": "https://api.mailtea.app/mcp"
    }
  }
}
```

Auth is OAuth with PKCE. Cursor prompts for Mailtea sign-in when the plugin connects — there is no API key to configure. On the consent screen you pick one publication and an access level (from read only to full access). The agent can act only inside that publication at that level, and you can revoke the connection in Mailtea at any time.

## Before you connect

You need a Mailtea account ([sign up](https://studio.mailtea.app/signup)). Sending also needs a [verified sending domain](https://docs.mailtea.app/docs/documentation/domains).

## Skills

| Skill | What it helps you do |
| --- | --- |
| `mailtea-email` | Send or schedule email, check delivery, draft newsletters, and manage contacts |
| `mailtea-email-design` | Design welcome emails, newsletters, and reusable templates for real inboxes |
| `mailtea-site-design` | Build or restyle your publication's website, with changes saved as drafts |

## What agents can do

| Category | Capabilities |
| --- | --- |
| Email | Send, batch, schedule, cancel, and resend email; track delivery and engagement |
| Newsletters | Draft, preview, test, schedule, and send newsletters |
| Audience | Manage contacts, properties, segments, topics, and suppressions |
| Automations | Build, preview, enable, and measure multi-step automations |
| Website | Edit pages, sections, navigation, and theme, and publish the site |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Every tool declares MCP safety hints, so the agent asks before a send or a delete.
- An email ID means the send was accepted, not delivered. Check delivery status before retrying a send that timed out.

## Docs

- Mailtea: https://mailtea.app
- MCP server docs: https://docs.mailtea.app/docs/documentation/mcp-server
- Source plugin: https://github.com/mailtea-app/mailtea-agent-plugin
- Server URL: https://api.mailtea.app/mcp

Skills are copied from [mailtea-app/mailtea-agent-plugin](https://github.com/mailtea-app/mailtea-agent-plugin). Logo is Mailtea's 512×512 mark from that repository.

## License

MIT
