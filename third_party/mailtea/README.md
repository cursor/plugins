# Mailtea

Cursor plugin that connects agents to [Mailtea](https://mailtea.app), an agent-native email and newsletter platform, through Mailtea's official hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Send and schedule transactional email, draft and send newsletters, manage contacts and segments, set up sending domains and senders, and check delivery and engagement from chat. The plugin also ships three skills for email, email design and website design.

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

Auth is OAuth 2.1 in the browser. On the consent screen you pick a publication and choose Read only or Full access. There is no API key or client ID to configure, and tokens are bound to the Mailtea server.

## Before you connect

You need a Mailtea account ([sign up](https://studio.mailtea.app/signup)). Sending to real recipients needs a verified sending domain. Until you add one, the built-in sender only sends to your own team.

## What agents can do

The server exposes 165 tools, grouped by what they work on.

| Category | Capabilities |
| --- | --- |
| Email | Send, batch, schedule, cancel, and resend email, check it before sending, track delivery and engagement, and read and reply to inbound mail |
| Newsletters | Draft, edit, preview, test, schedule, and send newsletters, publish them to your website, follow delivery progress, and manage sponsor offers |
| Templates | Create, render, publish, duplicate, and version reusable email templates |
| Audience | Manage contacts and their properties, import a CSV, build segments and topics, handle suppressions, and run referral milestones |
| Automations | Build, validate, enable, and measure multi-step automations, and send the custom events that start them |
| Website | Edit pages, sections, navigation, footer, theme, and design brief, manage images, and publish your publication's website |
| Sending setup | Add and verify sending and tracking domains, and manage senders |
| Analytics | Newsletter performance, trends, poll results, and CSV exports |
| Account | List and create publications, connect custom website domains, manage API keys and webhooks, and check who is connected |

The hosted runtime is the source of truth for tool names and schemas.

## Safety

- Agents are told to confirm before sending to real recipients.
- Sends use exactly the recipients and content you specify.
- Drafts stay drafts until you ask for them to be sent or published.
- With Read only access, the agent can look but cannot change anything.

## Links

- Docs: https://docs.mailtea.app
- Support: https://docs.mailtea.app/docs/documentation/agent-plugin and support@mailtea.app
- Privacy policy: https://mailtea.app/privacy-policy
- Terms of service: https://mailtea.app/terms-of-service
- Server URL: https://api.mailtea.app/mcp

Logo is Mailtea's official mark.

## License

MIT
