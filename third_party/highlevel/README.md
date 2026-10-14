# HighLevel

Cursor plugin that connects agents to [HighLevel](https://www.gohighlevel.com) (also branded LeadConnector) through HighLevel's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Find and update CRM data in a HighLevel sub-account — contacts, conversations and messages, opportunities and pipelines, calendars and appointments, payments, blogs, email templates, and social posts.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HighLevel**.
3. Click **Install**, then complete the LeadConnector sign-in prompt.

Or run `/add-plugin highlevel` in chat.

## MCP

```json
{
  "mcpServers": {
    "highlevel": {
      "type": "http",
      "url": "https://services.leadconnectorhq.com/mcp/"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration and PKCE. Cursor registers itself and opens the LeadConnector sign-in when the plugin connects: sign in, choose the sub-account (location) to expose, and approve. There is no Private Integration Token or `locationId` header to configure.

## What agents can do

Tools depend on the scopes granted to the connection. HighLevel's docs list tools in these areas:

| Area | Example tools |
| --- | --- |
| Contacts | `contacts_get-contacts`, `contacts_get-contact`, `contacts_create-contact`, `contacts_update-contact`, `contacts_upsert-contact`, `contacts_add-tags`, `contacts_remove-tags`, `contacts_get-all-tasks` |
| Conversations | `conversations_search-conversation`, `conversations_get-messages`, `conversations_send-a-new-message` |
| Opportunities | `opportunities_search-opportunity`, `opportunities_get-pipelines`, `opportunities_get-opportunity`, `opportunities_update-opportunity` |
| Calendars | `calendars_get-calendar-events`, `calendars_get-appointment-notes` |
| Locations | `locations_get-location`, `locations_get-custom-fields` |
| Payments | `payments_get-order-by-id`, `payments_list-transactions` |
| Blogs | `blogs_get-blogs`, `blogs_get-blog-post`, `blogs_create-blog-post`, `blogs_update-blog-post` |
| Email templates | `emails_fetch-template`, `emails_create-template` |
| Social posts | `socialmediaposting_get-posts`, `socialmediaposting_create-post`, `socialmediaposting_edit-post`, `socialmediaposting_get-social-media-statistics` |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- The server can write as well as read — including sending messages, updating contacts and opportunities, and creating posts. Approve only the access agents need, and test on a non-production sub-account first.
- Each connection works against the sub-account chosen at sign-in.
- HighLevel also publishes client-specific OAuth endpoints for Claude (`/mcp/anthropic/v2`) and OpenAI clients (`/mcp/openai/v2/`) that expose a broader operation catalog through a small set of unified tools. This plugin uses the universal endpoint.

## Docs

- MCP server help article: https://help.leadconnectorhq.com/support/solutions/articles/155000008185
- Developer docs: https://marketplace.gohighlevel.com/docs/other/mcp/
- Server URL: https://services.leadconnectorhq.com/mcp/

Logo is HighLevel's official arrow mark, taken from the wordmark on gohighlevel.com.

## License

MIT
