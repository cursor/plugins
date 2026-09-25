# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Declares `"placement": "server"` on the MCP server so Grok Bot (desktop and mobile) dials it through the hosted MCP path.

- Listed as `posthog-mcp` / "PostHog MCP": the `posthog` name belongs to PostHog's own marketplace plugin (id 730), and two APPROVED plugins with one name collide in the indexer.

- Added the `posthog` MCP server pointing at PostHog's hosted Streamable HTTP endpoint (`https://mcp.posthog.com/mcp`).
- Auth uses OAuth with PostHog user login (PKCE, dynamic client registration via `oauth.posthog.com`) — no API key or client ID to configure. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Logo: PostHog's official hedgehog mark, the favicon published on posthog.com rendered as-is (white mark on PostHog's black tile) at 192×192.
