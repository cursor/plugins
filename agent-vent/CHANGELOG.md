# Changelog

## 0.3.0

- Switched the runtime from Deno to **Bun**, matching the toolchain already used elsewhere in this repo. Launches with `bun run server.ts`; dependencies are pinned in `package.json` and auto-installed from Bun's global cache (`bunfig.toml` sets `install.auto = "fallback"`). No committed `node_modules`, no build step.
- No behavior change to the `vent` tool, JSONL storage, or Slack delivery.

## 0.2.0

- Rewritten in TypeScript on the official MCP SDK (`@modelcontextprotocol/sdk`), with `zod` input schemas.
- Now runs install-free via `deno run`: npm dependencies are declared inline and cached by Deno (no `package.json`, no `node_modules`, no build). `deno.lock` pins transitive versions.
- Behavior is unchanged — same `vent` tool, same JSONL storage layout and key order, same best-effort Slack delivery.

## 0.1.0

- Initial release.
- `vent` tool: file freeform grievances with optional `mood` and `intensity`.
- JSONL storage per project at `.cursor/complaints.jsonl` (with `unfiled` fallback).
- Optional best-effort Slack delivery via incoming webhook or bot token, configured through environment variables.
- Launches via `uv run` with PEP 723 inline dependencies — no virtualenv required.
