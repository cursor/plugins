# Web browser plugin

Browser debugging: DevTools, network traces, and reproducible bug reports.

## Requirements

This plugin requires MCP browser tools (`browser_navigate`, `browser_snapshot`, `browser_network_requests`, etc.). These are included automatically in the Cursor desktop app. If you're using Cursor outside the desktop app, you'll need to install a browser MCP server separately.

## Installation

```bash
agent install web-browser
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `debug-with-browser-tools` | DevTools and network-debug workflow |
| `analyze-web-performance` | Performance bottlenecks with reproducible metrics |
| `capture-browser-repro` | Precise reproduction record for debugging |
| `network-trace-debug` | Structured network analysis for request/response failures |

### Agents

| Agent | Description |
|:------|:------------|
| `browser-debugger` | Reproduction, trace analysis, and fix validation |

## MCP browser workflow (canonical)

**Lock/unlock (critical):** `browser_lock` requires an existing tab. You cannot lock before `browser_navigate`. Correct order: `browser_navigate` (or verify via `browser_tabs`) → `browser_lock` → interactions → `browser_unlock` when fully done. If a tab exists, call `browser_lock` first.

**Pre-interaction:** Use `browser_tabs` (action: list) and `browser_snapshot` to get element refs before any click, type, or hover.

**Waiting:** Prefer short incremental waits (1–3s) with `browser_snapshot` checks between them instead of a single long wait.

**Performance profiling:** `browser_profile_start`/`browser_profile_stop` for CPU profiling. Profile data in `~/.cursor/browser-logs/`. Read raw cpu-profile-*.json to verify findings. Cross-reference with summary.

**Notes:** Native dialogs (alert/confirm/prompt) never block automation. Iframe content is not accessible. Use `browser_type` to append text, `browser_fill` to clear and replace. For nested scroll containers, use `browser_scroll` with `scrollIntoView: true` before clicking obscured elements.

## License

MIT
