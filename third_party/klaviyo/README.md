# Klaviyo

Cursor plugin that connects agents to [Klaviyo](https://www.klaviyo.com) through Klaviyo's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Build segments, draft campaigns and flows, look up profiles and events, and pull reporting from the signed-in Klaviyo account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Klaviyo**.
3. Click **Install**, then complete the Klaviyo sign-in prompt.

Or run `/add-plugin klaviyo` in chat.

## MCP

```json
{
  "mcpServers": {
    "klaviyo": {
      "type": "http",
      "url": "https://mcp.klaviyo.com/mcp"
    }
  }
}
```

Auth is OAuth with Dynamic Client Registration. Cursor registers itself and prompts for Klaviyo sign-in when the plugin connects — there is no API key or client ID to configure.

## Before you connect

You need the **Owner**, **Admin**, or **Manager** role on the Klaviyo account. Tool calls run with that user's permissions.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Profiles & events | Look up and update profiles, push events, and manage consent and data-privacy requests |
| Lists & segments | Create and query lists and segments, and manage membership |
| Campaigns & flows | Draft, schedule, and inspect email, SMS, and push campaigns and flows |
| Templates & catalogs | Manage templates, images, coupons, catalogs, and reviews |
| Reporting | Campaign, flow, form, and segment performance reporting |
| Account config | Accounts, brands, tags, sending domains, webhooks, and applications |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run as the Klaviyo user who authorizes the connection and cannot exceed that user's permissions.
- The full catalog is large. Klaviyo supports URL query parameters to trim it — `?core-tools-only=true` for the core set, `?read-only=true` to drop every write tool, and `?toolsets=profiles:read,campaigns:read` to pick specific toolsets. Edit the plugin's server URL if you want a narrower surface.
- `?disable-tools-with-user-generated-content=true` hides tools that return user-generated content, which is worth setting on shared or sensitive accounts.
- Add `?company=your-company-slug` to pin a specific account when you belong to more than one.
- The URL must have no trailing slash.

## Docs

- Klaviyo MCP server: https://developers.klaviyo.com/en/docs/klaviyo_mcp_server
- MCP server guide (help center): https://help.klaviyo.com/hc/en-us/articles/52833598880923
- Server URL: https://mcp.klaviyo.com/mcp

Logo is Klaviyo's official mark, from the `klaviyo` GitHub organization.

## License

MIT
