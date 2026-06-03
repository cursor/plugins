# ThumbGate — for Cursor

`ThumbGate` is the human-facing plugin name in Cursor listings.
`thumbgate` stays the plugin slug, npm package, and launcher target.

The canonical short description is:

> 👍👎 Thumbs down a mistake — your AI agent won't repeat it. Thumbs up good work — it remembers the pattern.

How it works:

- 👎 **Thumbs down** a mistake — it gets blocked from happening again
- 👍 **Thumbs up** good work — the agent remembers the pattern
- **History-aware lesson distillation** — vague thumbs-down signals can be grounded in up to 8 prior recorded entries and the failed tool call
- **Cross-session memory** — lessons persist between conversations
- **Automatic enforcement** — repeated failures become prevention rules
- **Zero config** — install and start giving feedback

## What's included

### Rules

| File | Always on | Description |
|------|-----------|-------------|
| `rules/pre-action-gates.mdc` | Yes | Before risky tool calls (git push, rm -rf, npm publish, deploy), check prevention rules via the thumbgate MCP server. Blocks and explains if a rule matches. |
| `rules/feedback-capture.mdc` | No | After any mistake or unexpected behavior, prompt to capture structured feedback with context and tags. |
| `rules/session-continuity.mdc` | No | At session start, recall past context; at session end, hand off state for next session. |

### Skills

| Skill | Description |
|-------|-------------|
| `recall-context` | Recall relevant past failures, prevention rules, and context packs before starting a coding task. |
| `capture-feedback` | Capture structured thumbs up/down feedback with context, tags, and optional rubric scores. |
| `search-lessons` | Search promoted lessons for corrective actions, lifecycle state, linked rules, and linked gates. |
| `prevention-rules` | Generate and review prevention rules auto-promoted from repeated failure patterns. |

### Agent

| Agent | Description |
|-------|-------------|
| `reliability-reviewer` | A reliability-focused reviewer that checks code changes against known failure patterns from the project's ThumbGate memory. |

### Commands

| Command | Description |
|---------|-------------|
| `/check-gates` | Run a Pre-Action Gate check against prevention rules before executing a risky action. |
| `/show-lessons` | Display promoted lessons and their corrective actions. |
| `/capture-feedback` | Quick feedback capture with structured signals. |

### Hooks

| Hook | Trigger | Description |
|------|---------|-------------|
| `beforeShellExecution` | `git push`, `rm -rf`, `npm publish`, `deploy` | Runs `scripts/gate-check.sh` to evaluate the command through ThumbGate `gate-check` before execution. |

### MCP Server

| Server | Command |
|--------|---------|
| `thumbgate` | `npx --yes --package thumbgate@latest thumbgate serve` |

## Install

Install from Cursor with:

```text
/add-plugin thumbgate
```

You can also open Cursor's plugin marketplace, search for `ThumbGate`, and add the plugin from there.

For private team rollouts before broad adoption, Cursor Teams and Enterprise admins can import a repository-backed plugin through `Dashboard -> Settings -> Plugins -> Team Marketplaces`.

### Manual setup

Use the existing project bootstrap:

```bash
npx thumbgate init --agent cursor
```

Or copy the plugin MCP config into `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "thumbgate": {
      "command": "npx",
      "args": ["--yes", "--package", "thumbgate@latest", "thumbgate", "serve"]
    }
  }
}
```

Full setup guide: https://thumbgate-production.up.railway.app/guide

## Update behavior

- Runtime updates: the plugin asks npm for `thumbgate@latest`, so new npm releases can flow into the Cursor runtime without editing the plugin config.
- Metadata updates: `npm publish` does not refresh the marketplace description, screenshots, README, or directory listing copy. Republish the plugin bundle when those assets change.
- Guaranteed rollouts: if you need deterministic behavior for a specific release, pin a version manually in local config instead of relying on `@latest`.

## Feedback

Use the `/capture-feedback` command or the `capture_feedback` MCP tool to send structured feedback directly to the ThumbGate memory system. Feedback drives prevention rule generation — repeated failure patterns are auto-promoted into enforceable gates.

When the user only gives a quick `thumbs_down`, `wrong`, or `correct`, the Cursor plugin should include up to 8 prior recorded entries and the failed tool call in `chatHistory` so ThumbGate can propose the lesson automatically. If the explanation comes later, reuse the earlier event with `relatedFeedbackId` so the linked 60-second follow-up session refines the same feedback record instead of creating an isolated duplicate.

## What makes this useful in Cursor

ThumbGate gives Cursor agents a practical guardrail layer:

- **Pre-Action Gates** block known-bad actions before tool use
- **Prevention rules** auto-generated from repeated failures
- **Context packs** keep relevant project history in scope
- **Feedback capture** with structured up/down signals and history-aware lesson proposals
- **Reliability reviewer** checks changes against known failure patterns

Verification evidence for shipped behavior lives in `docs/VERIFICATION_EVIDENCE.md`.
Release and promotion rules live in `docs/CURSOR_PLUGIN_OPERATIONS.md`.
Proof-backed setup path: https://thumbgate-production.up.railway.app/guide
