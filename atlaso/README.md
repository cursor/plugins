# Atlaso Memory for Cursor

**Long-term memory for Cursor — it recalls what you've decided and remembers what
matters, across sessions, projects, and tools.**

Atlaso is a memory layer for the AI era. This plugin gives Cursor a memory that
persists after you close the chat: your preferences, decisions, conventions, and the
gotchas you've hit — recalled automatically the next time they're relevant.

[atlaso.ai](https://atlaso.ai) · one memory across Cursor, Claude Code, Codex, and more.

---

## Install

**From the Cursor Marketplace** (Cursor 2.5+):

```
/add-plugin atlaso-labs/cursor
```

Then fully **restart Cursor** to start the memory hooks. The first chat links your
device automatically (a browser window opens once to authorize).

**Or with the Atlaso CLI** (if you already use Atlaso elsewhere):

```
curl -fsSL https://atlaso.ai/install.sh | bash
atlaso setup   # → choose Cursor
```

## What it does

- **Remembers automatically.** Every session, Atlaso captures what's worth keeping from
  your conversation — no "save this" required. Zero model involvement, no slowdown.
- **Recalls automatically.** When you start a session, relevant notes from past work are
  surfaced to the agent as context.
- **Deliberate control when you want it** — five MCP tools: `recall`, `remember`,
  `forget`, `recent`, `status`. Ask the agent to "remember X" or "what did we decide
  about Y" and it uses them.
- **Global + per-project.** Personal preferences follow you everywhere; project facts
  stay scoped to the repo.
- **One brain across your tools.** The same memory shows up in Claude Code, Codex, and
  the others — write it once in Cursor, recall it anywhere.

## Privacy

- **Secrets are scrubbed on your machine** before anything is sent — API keys, tokens,
  and credentialed URLs are redacted client-side (and again server-side).
- **Per-tool credentials.** This plugin holds its own credential, so removing Cursor
  removes only Cursor's access — nothing else.
- **It never breaks a turn.** If memory is offline, Cursor just works as usual.

Your memories are your data — view, search, and delete them at
[app.atlaso.ai/dashboard](https://app.atlaso.ai/dashboard).

## Components

| Component | What it adds |
|---|---|
| Hooks | The automatic recall + capture loop |
| `atlaso` MCP server | `recall` · `remember` · `forget` · `recent` · `status` |
| Rule | Orients the agent to treat recall as known context |
| Skill | Curation judgment — what's worth remembering |

## Links

- Website — [atlaso.ai](https://atlaso.ai)
- Dashboard — [app.atlaso.ai](https://app.atlaso.ai)
- Other tools — [Claude Code](https://github.com/atlaso-labs/claude-code) ·
  [Codex](https://github.com/atlaso-labs/codex) ·
  [Antigravity](https://github.com/atlaso-labs/antigravity)

## License

MIT © Atlaso Labs
