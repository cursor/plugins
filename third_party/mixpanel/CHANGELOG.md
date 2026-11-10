# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Replaced the hardcoded US URL with `https://${MIXPANEL_MCP_HOST}/mcp`.
- Added the `MIXPANEL_MCP_HOST` setup value ("Mixpanel region"), an enum of `mcp.mixpanel.com` (United States), `mcp-eu.mixpanel.com` (Europe), and `mcp-in.mixpanel.com` (India). Grok Bot asks for it when you sign in; Cursor shows it as a setup choice.
- A 1.0.0 connection that already signed in to the US server needs the United States region selected and a fresh Mixpanel sign-in.

## 1.0.0 — initial release

- Added the `mixpanel` MCP server pointing at Mixpanel's hosted Streamable HTTP endpoint (`https://mcp.mixpanel.com/mcp`, US).
- Auth uses OAuth with Mixpanel user login (authorization code + PKCE, dynamic client registration) — no API key or client ID to configure.
- Logo: Mixpanel's official mark, the favicon published on mixpanel.com, white on the dark tile used by mixpanel.com's apple-touch icon, at 192×192.
