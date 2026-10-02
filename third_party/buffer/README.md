# Buffer

Cursor plugin that connects agents to [Buffer](https://buffer.com) through Buffer's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read your connected social channels, browse the queue and drafts, draft, schedule, edit, and publish posts, capture ideas, reuse post templates, and pull post analytics — all from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Buffer**.
3. Click **Install**, then complete the Buffer sign-in prompt.

Or run `/add-plugin buffer` in chat.

## MCP

```json
{
  "mcpServers": {
    "buffer": {
      "type": "http",
      "url": "https://mcp.buffer.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Buffer sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own Buffer account.

## Before you connect

You need a Buffer account ([sign up](https://buffer.com)) with at least one connected social channel. MCP access is included on every Buffer plan, including Free. Requests count against the same [rate limits](https://developers.buffer.com/guides/api-limits.html) as any other API client, with quotas that depend on your plan; every tool response reports the remaining quota. The connection covers your whole account — every organization and channel in it — so if you belong to more than one organization, the agent will ask which one you mean.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Account | `get_account` returns the signed-in account, its organizations with plan limits and member counts, and the account timezone with its current local time, which the agent uses to turn "tomorrow at 5pm" into a real timestamp |
| Channels | `list_channels` lists the social accounts connected to an organization (service, type, avatar, connection status); `get_channel` adds a channel's posting schedule, posting goals, queue status, timezone, link shortening, and service-specific data such as Pinterest boards |
| Posts | `list_posts` filters by channel, status (`draft`, `needs_approval`, `scheduled`, `sending`, `sent`, `error`), tags, and date ranges, with optional per-post metrics; `get_post` reads one post in full including any publishing error; `create_post` schedules or publishes on one channel with queue, share-now, share-next, or custom-time modes, media, threads, link previews, service metadata, and a save-to-draft option; `edit_post` changes text, media, tags, or scheduling; `delete_post` removes a post permanently |
| Ideas | `list_ideas` and `list_idea_groups` browse the ideas board; `create_idea` saves a concept with title, text, media, tags, target services, and target date without scheduling anything |
| Post templates | `list_post_templates`, `get_post_template`, `create_post_template`, `update_post_template`, and `delete_post_template` manage reusable templates with `{{placeholders}}` at private or internal visibility |
| Analytics | `get_aggregated_post_metrics` totals reactions, comments, and, where every channel supports them, reach, impressions, and engagement rate across posts in a date range of up to 365 days |
| GraphQL | `introspect_schema` returns the full Buffer API schema; `execute_query` runs a read-only query and `execute_mutation` runs a mutation for anything the tools above do not cover |

The server also exposes the schema as a `buffer://schema` resource and a `review_weekly_posts` prompt that groups the week's scheduled posts by channel.

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- **Publishing is live to real social accounts.** `create_post` with `shareNow` publishes immediately, and `automatic` scheduling publishes without a further check; `delete_post` cannot be undone. Confirm the channel, text, and time before letting the agent publish or schedule, and leave Cursor's tool-approval prompts on for write tools.
- `saveToDraft` on `create_post` keeps a post in the queue for review instead of scheduling it, and `schedulingType: notification` sends you a reminder to post manually rather than publishing for you.
- `execute_mutation` can reach any state-changing operation in the Buffer GraphQL API, not only posts.
- Post metrics refresh once a day, so analytics can lag the social network by up to a day.

## Docs

- MCP integration guide: https://developers.buffer.com/guides/integrations/mcp.html
- MCP overview: https://buffer.com/mcp
- API reference: https://developers.buffer.com/
- Server URL: https://mcp.buffer.com/mcp

Logo is Buffer's official mark.

## License

MIT
