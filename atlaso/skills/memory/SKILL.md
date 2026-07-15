---
name: memory
description: >-
  What's worth keeping in Atlaso long-term memory, and whether a fact is personal
  vs project-specific. Use when deciding if something is durable enough to remember,
  or when the user asks you to remember, recall, or forget something.
---

# Using Atlaso memory well

Memory in Cursor is mostly **automatic** (see the Atlaso rule for the mechanics):
recall arrives at session start, and capture runs when a turn ends. Your job is
judgment — keeping the signal clear so auto-capture grabs the right thing, and using
the deliberate `atlaso` tools when they genuinely help.

## What's worth remembering (default: don't)

Durable, reusable facts:

- decisions **and the reason** behind them
- the user's stable preferences and working style
- hard-won gotchas ("X silently fails unless Y")
- stable facts/commands (ports, endpoints, conventions)

Skip: transient state ("ran the tests just now"), secrets/tokens, and restatements of
files already in the repo. A smaller, higher-signal memory beats volume — so reach for
`remember` sparingly, for things that will still matter next week.

## Personal vs project

- **Personal** (follows the user everywhere): cross-project preferences, identity,
  working style → "true in every repo."
- **Project** (this repo only): architecture, repo-specific decisions and gotchas
  → "true only here."

Rule of thumb: *would this still be true in a different project?* Yes → personal,
No → project. Scope is inferred from phrasing, so be explicit when it matters.

## The deliberate tools

The `atlaso` MCP server backs the automatic loop with five tools for when you want to
act on purpose:

- `recall <query>` — pull relevant past memory before answering (read-only).
- `remember <text>` — save a durable fact the user asked to keep.
- `forget <id>` — delete a memory by id (ids come from `recall`/`recent`); only when asked.
- `recent` — list the latest memories.
- `status` — connected? how many memories, and the memory-health score.
