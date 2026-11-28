# Changelog

All notable changes to this plugin will be documented here.

## 0.10.0 - initial release

- Skills refreshed from the Mailtea agent plugin at commit `05c0bf7`: dark mode for emails, per-block `visibility` for email and web, and domain DNS checks with a `next_step` on each record. Code samples use the placeholder `YOUR_API_KEY`.

- First Cursor marketplace release. Matches Mailtea agent plugin 0.10.0.
- Added the `mailtea` MCP server pointing at Mailtea's hosted Streamable HTTP endpoint (`https://api.mailtea.app/mcp`), with `"placement": "server"` so Grok Bot dials it through the hosted path.
- Auth uses OAuth 2.1 in the browser. You pick a publication and Read only or Full access on the consent screen. No API key or client ID to configure.
- Ships three skills: `mailtea-email`, `mailtea-email-design` and `mailtea-site-design`.
- Logo: Mailtea's official mark on a 192x192 tile.
