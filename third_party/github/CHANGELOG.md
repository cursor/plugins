# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0

- Added the optional `GITHUB_MCP_FEATURES` plugin variable, forwarded through the `X-MCP-Features` header. Set it to `mcp_apps_disable_form_deferral` so `issue_write`, `create_pull_request` and `update_pull_request` run directly in automations and background agents instead of stopping on an MCP App form nobody can submit. Empty by default, which keeps GitHub's defaults.

## 1.0.0 — initial release

- Logo: GitHub's official Octocat mark, on a padded white tile.
- Added the `github` MCP server pointing at `https://api.githubcopilot.com/mcp/`.
- Declared `GITHUB_PERSONAL_ACCESS_TOKEN` plugin variable and forwarded it through the Authorization header.
