# Changelog

All notable changes to this plugin will be documented here.

## 1.0.1

- Made `CLIENT_SECRET` optional so a Zoom Public Client ID signs in with PKCE and no secret, which is what Zoom requires for the desktop loopback redirect.
- Documented the desktop redirect as `http://127.0.0.1:8787/callback`, since Zoom rejects `localhost`.

## 1.0.0 — initial release

- Logo: Zoom's official 180×180 apple-touch icon.
- Added the `zoom` MCP server pointing at `https://mcp.zoom.us/mcp/zoom/streamable`.
- Declared `CLIENT_ID` and `CLIENT_SECRET` plugin variables and forwarded them through MCP auth, since Zoom requires manual OAuth client registration.
