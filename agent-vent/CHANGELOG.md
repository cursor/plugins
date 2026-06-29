# Changelog

## 0.1.0

- Initial release.
- `vent` tool: file freeform grievances with optional `mood` and `intensity`.
- JSONL storage per project at `.cursor/complaints.jsonl` (with `unfiled` fallback).
- Optional best-effort Slack delivery via incoming webhook or bot token, configured through environment variables.
- Launches via `uv run` with PEP 723 inline dependencies — no virtualenv required.
