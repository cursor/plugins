---
name: aether-debugging
description: Use Aether MCP tools when debugging Unity gameplay behavior, analyzing runtime crashes, inspecting object state during Play Mode, or when the user asks what happened before a crash or why an object is misbehaving.
---

# Aether Unity Debugging

## MCP Gate (Required First)

**Before recommending any Aether tool calls:** Check whether Aether tools are available. If the user gets "tool not found," "aether_snapshot failed," or similar errors, or if you cannot invoke Aether tools:

1. **Instruct the user to run** `npx aether-init` from their Unity project root.
2. **Tell them to reload Cursor** (Ctrl+Shift+P → "Reload Window").
3. **Then retry** the Aether tool call.

Only recommend tool calls (aether_snapshot, aether_tail, etc.) **after** confirming Aether is configured. Do not suggest tools the user cannot use.

---

## When to Use

- User mentions Unity, gameplay bug, crash, or runtime error
- User asks "what went wrong?", "what happened before this crash?", "why is this object falling through the floor?"
- User is debugging in Play Mode and needs object state or event history
- User references Aether tools or GTML

## Prerequisites (for tool calls)

1. User ran `npx aether-init` from their Unity project root
2. Unity is in Play Mode (for live data) or has recorded a session (for replay)

## Key Tools

| Tool | Use when |
|------|----------|
| `aether_snapshot` | Need current state of selected GameObject, scene, frame |
| `aether_tail` | Need recent events, console logs, state changes (last N seconds) |
| `aether_console` | Need to search/filter Unity stdout logs |
| `aether_last_run_answer` | Need causal answer for "what led to this?" with receipts |
| `aether_docs` | Need full tool documentation |

## Workflow

1. **Live Inspector**: User selects GameObject in Unity → ask for snapshot → analyze GTML for issues (disabled colliders, wrong velocity, etc.)
2. **Replay / Crash**: User hit a bug → ask "what happened before this crash?" → use `aether_tail` or `aether_last_run_answer` for timeline
3. **Console search**: Use `aether_console` with text/level filters to find relevant logs
4. **Verification**: After making code changes, ask the user to enter Play mode, then use Aether to verify the fix worked (snapshot, tail, or last_run_answer)

## Output Format

Aether returns GTML (Game Temporal Markup Language)—structured XML that LLMs parse well. Look for `[ISSUE: ...]` tags for detected problems.
