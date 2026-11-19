# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1 — teammate auth only

- Document that credentials must come from a Front developer app with the Front MCP feature, and that AI agent credentials from Settings → Company → Agents are not supported.
- Document the two OAuth redirect URLs Cursor actually sends: `http://localhost:8787/callback` on desktop, and `https://www.cursor.com/agents/mcp/oauth/callback` on web, Cloud Agents, and Grok Bot.
- Note that tool calls run as the signed-in teammate, that rate limits are per teammate (100 / 200 / 300 tool calls per minute by Front plan), and that Front's AI agent webhooks are out of scope.

## 1.0.0 — initial release

- Added the `front` MCP server pointing at Front's hosted Streamable HTTP endpoint (`https://mcp.frontapp.com/mcp`).
- Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth, since Front requires a confidential client and does not support dynamic client registration.
- Requested the `feature:mcp` scope, the value Front documents for clients that need one.
- Logo: Front's official 192×192 app icon.
