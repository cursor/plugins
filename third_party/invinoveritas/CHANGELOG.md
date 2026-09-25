# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `invinoveritas` MCP server pointing at `https://api.babyblueviper.com/mcp`, verified
  live against the production `review`/`verify_proof` tools before release.
- Declared `IVV_API_KEY` plugin variable and forwarded it through the Authorization header.
- Added the `pre-action-review` skill: teaches the agent to call `review` before an irreversible
  or high-consequence action (destructive commands, merges, deploys, migrations) and how to act
  on the returned verdict.
