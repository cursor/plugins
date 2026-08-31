# Changelog

## 1.3.0 - 2026-08-31

- Cursor support: `.cursor-plugin/plugin.json` manifest with a typed `ACCOUNTSOS_API_KEY` variable, so Cursor's settings UI prompts for the key instead of a manual export.
- Declared the MCP server as `type: "http"` (hosted endpoint at `https://accounts-os.com/api/mcp`, bearer auth).
- Added `assets/logo.png` and this changelog.

## 1.2.0 - 2026-08-19

- Grok Build support: `.grok-plugin/plugin.json` manifest describing the same skills, commands, and MCP connector.
- Repo renamed to `accountsos-agent-plugin` (ecosystem-neutral).

## 1.1.0 - 2026-04-24

- Initial release for Claude Cowork and Claude Code.
- 4 auto-firing UK tax skills (uk-accounting, vat-rules, expense-categories, tax-deadlines), verified for the 2026/27 tax year.
- 6 slash commands (weekly-check, log-expense, vat-check, deadlines, invoices, categorize).
- Hosted MCP connector to the AccountsOS API.
