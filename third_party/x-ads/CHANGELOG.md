# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `x-ads` MCP server pointing at `https://ads-api.x.com/mcp`.
- OAuth user sign-in using X's client ID `NGdZYmo4VVp2T1BnRG55NlExOGQ6MTpjaQ` (the same client the X connector uses), requesting `ads.read`, `ads.write`, `media.write`, and `offline.access`.
- Separate plugin from X: `ads-api.x.com` is a different protected resource than `api.x.com` with different scopes, so it requires its own authorization.
- Logo: X's official mark from the X brand toolkit, on a black tile matching X's own app icon.
