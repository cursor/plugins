# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `strava` MCP server pointing at Strava's hosted Streamable HTTP endpoint (`https://mcp.strava.com/mcp`).
- Auth uses OAuth with Strava athlete login through Grok's Strava app (scopes `read`, `activity:read_all`, and `profile:read_all`). Grok holds the client credentials, so there is no API key or client ID to configure.
- Available in Grok Bot only.
- Logo: Strava's official app icon, the 180×180 touch icon published on strava.com.
