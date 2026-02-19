# Aether

**AI co-debugging for Unity.** Stop narrating your gameplay—your AI can see the game.

Aether bridges your Unity game to Cursor, giving the AI complete context: live state, event history, crashes, and GTML snapshots. Two modes: **Live Inspector** (real-time object inspection) and **Replay Mode** (time-travel debugging after a bug).

---

## Install

```bash
/add-plugin aether
```

That's it. The bridge auto-downloads on first use.

**First time in a Unity project?** Run this once from your project root:

```bash
npx aether-init
```

Then reload Cursor (Ctrl+Shift+P → Reload Window), enter Play mode, and ask your AI: *"What's the state of my game?"*

---

## Requirements

Unity 2021.3+, Node.js 18+, Cursor with MCP

---

## When the Agent Uses Aether

The plugin includes a skill that guides the agent to use Aether when:

- Debugging Unity gameplay behavior
- Analyzing crashes, NullReferenceExceptions, or runtime errors
- Inspecting object state during Play Mode
- Asking "what happened before this crash?" or "why is this object behaving wrong?"

The agent will call tools like `aether_snapshot`, `aether_tail`, `aether_console`, and `aether_last_run_answer` to get live context from your game.

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `aether_snapshot` | Current Unity state: selected object, scene, frame, recent events |
| `aether_tail` | Events + console + state over last N seconds |
| `aether_console` | Query Unity stdout logs with filters |
| `aether_last_run_answer` | Answer engine for the last run with receipts |
| `aether_mark` | Save a moment (clip) with context |
| `aether_docs` | Get authoritative tool documentation |

See [Aether docs](https://docs.getaether.dev) for the full tool list.

---

## Manual Setup

Technical users or non-Cursor setups: see [getaether.dev](https://getaether.dev) for download links and manual MCP configuration.

---

## Pro Trial

Aether Pro includes proof clips, capsules, probes, and vision analysis. **14-day free trial, no credit card required.** See [getaether.dev](https://getaether.dev) for details.

---

## Troubleshooting

**MCP won't start / "script not found"** — Cursor runs the launcher from the plugin directory. If you see script path errors, ensure the plugin was installed correctly. You can still use Aether by running `npx aether-init`; it writes `.cursor/mcp.json` with the direct bridge path.

## Windows SmartScreen

On first run, Windows may show SmartScreen for the bridge binary. Choose "More info" → "Run anyway." The binary is signed; this is a one-time prompt.

---

## License

MIT
