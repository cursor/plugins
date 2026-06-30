# Changelog

## 0.1.0

- Initial release.
- `vent` tool: record a freeform grievance with optional `intensity`, routed by `project_path`.
- Pluggable destinations selected via `VENT_DESTINATIONS` (defaults to `file`, plus `slack` when Slack credentials are present):
  - `file` — appends the grievance as JSONL to `<project>/.cursor/complaints.jsonl`, with an `unfiled` fallback.
  - `slack` — posts via incoming webhook or bot token. Best-effort; never fails the tool call.
- Written in TypeScript on the MCP SDK (`@modelcontextprotocol/sdk`); runs install-free with `bun run --install=fallback` (dependencies pinned in `package.json`, auto-installed from Bun's global cache).
