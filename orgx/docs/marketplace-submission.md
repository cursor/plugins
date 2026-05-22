# Marketplace Submission Notes

## Product artifact

Cursor Marketplace reviews plugins, not bare MCP servers.

This repo is the plugin artifact that sits on top of `orgx-mcp` and bundles:

- `.cursor-plugin/plugin.json`
- `.mcp.json`
- rules
- skills
- agents
- commands
- hooks

## Publish flow

1. Verify locally with `npm run verify`
2. Install locally with `npm run install:local`
3. Confirm the plugin loads in Cursor from `~/.cursor/plugins/local/cursor-plugin`
4. Submit for review at `https://cursor.com/marketplace/publish`

## Repo-local overlay

The plugin defaults can be overridden additively by project-specific overlays inside a target repo:

- `.cursor/orgx/`
- `.cursor/commands/`
- `.cursor/rules/`
