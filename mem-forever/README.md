# Mem-Forever

Persistent memory across sessions and tools. Your AI remembers who you are, what you decided, and what you learned — forever.

## Installation

```
/add-plugin mem-forever
```

## How it works

On session start, the plugin reads `.ilang/soul.md` (your profile) and `.ilang/memory.md` (your logbook). If no profile exists, it runs a brief onboarding conversation to build one.

During the session, significant decisions, lessons, and facts are appended to memory and committed to git immediately. No data is lost even if the session ends abruptly.

The same `.ilang/` files work across Cursor, Claude Code, Codex, Copilot, and Gemini CLI — switch tools without losing context.

## Files

| File | Purpose |
|---|---|
| `.ilang/soul.md` | Behavioral profile, auto-generated from conversation |
| `.ilang/memory.md` | Append-only logbook of decisions, lessons, facts |

## Template repository

For a dedicated memory repo with full setup, see [Mem-Forever template](https://github.com/ilang-ai/Mem-Forever).

## License

MIT
