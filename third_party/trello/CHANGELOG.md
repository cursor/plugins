# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1 — hosted placement

- Declares `"placement": "server"` on the MCP server so Grok Bot (desktop and mobile) dials it through the hosted MCP path. Without it the row stays UNDECIDED and never shows a connect / sign-in card in Grok Bot.

## 1.0.0 — initial release

- Added the `trello` MCP server pointing at Atlassian's hosted Streamable HTTP endpoint for Trello (`https://mcp.trello.com/v1`).
- Auth uses OAuth with Atlassian account login (PKCE, dynamic client registration via Atlassian's authorization server at `auth.atlassian.com`) — no API key or client ID to configure. Registration was verified to accept every Cursor redirect set, including Grok Bot mobile.
- Logo: Trello's official mark, taken from the logo Atlassian publishes in the `atlassian/trello-mcp-server` repository, at 160×160 with 16px padding on a white 192×192 tile.
