# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Replaced the three regional servers with one `vanta` server at `https://${VANTA_MCP_HOST}/mcp`, so a user sees one Vanta connection instead of three.
- Added the `VANTA_MCP_HOST` setup value ("Vanta region"), an enum of `mcp.vanta.com`, `mcp.eu.vanta.com`, and `mcp.aus.vanta.com`. Grok Bot asks for it when you sign in; Cursor shows it as a setup choice.

## 1.0.0 — initial release

- Added one MCP server per Vanta region, pointing at Vanta's hosted Streamable HTTP endpoints: `vanta-us` (`https://mcp.vanta.com/mcp`), `vanta-eu` (`https://mcp.eu.vanta.com/mcp`), and `vanta-aus` (`https://mcp.aus.vanta.com/mcp`). Each uses `"placement": "server"` so Grok Bot connects through Cursor's hosted path. Server names match Vanta's own plugin (`VantaInc/vanta-mcp-plugin`).
- Auth uses MCP OAuth with Vanta account login, Dynamic Client Registration, and PKCE — no API token, client secret, or custom header to configure.
- Logo: the "V" glyph from Vanta's official wordmark, from `https://cdn.prod.website-files.com/64009032676f24f376f002fc/6400ac82429afb0f7b31fa6c_vanta-logo.svg` (Vanta Inc.).
