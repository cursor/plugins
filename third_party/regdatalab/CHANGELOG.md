# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `regdatalab` MCP server pointing at RegDataLab's hosted Streamable HTTP endpoint (`https://www.regdatalab.com/mcp`).
- Auth uses OAuth with a RegDataLab account signed in on the consent page. No API key goes in the config. `Authorization: Bearer` remains available only for clients without OAuth.
- Logo: official 512×512 RegDataLab mark, committed as `assets/logo.png`.
