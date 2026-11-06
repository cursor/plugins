## 1.0.1

- Require a non-empty `GITHUB_PERSONAL_ACCESS_TOKEN` (`minLength: 1`) and document the empty-Bearer / streaming-400 failure mode.

# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Logo: GitHub's official Octocat mark, on a padded white tile.
- Added the `github` MCP server pointing at `https://api.githubcopilot.com/mcp/`.
- Declared `GITHUB_PERSONAL_ACCESS_TOKEN` plugin variable and forwarded it through the Authorization header.
