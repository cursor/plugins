# Changelog

All notable changes to this plugin will be documented here.

## 0.10.0 - initial release

- First Cursor marketplace release. Matches Mailtea agent plugin 0.10.0.
- Added the `mailtea` MCP server pointing at Mailtea's hosted Streamable HTTP endpoint (`https://api.mailtea.app/mcp`), with `"placement": "server"` so Grok Bot dials it through the hosted path.
- Auth uses OAuth 2.1 in the browser. You pick a publication and Read only or Full access on the consent screen. No API key or client ID to configure.
- Ships three skills: `mailtea-email`, `mailtea-email-design` and `mailtea-site-design`.
- Logo: Mailtea's official mark on a 192x192 tile.
