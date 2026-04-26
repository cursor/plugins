---
name: mem-forever
description: Load and maintain persistent user memory from .ilang/soul.md and .ilang/memory.md. Run at session start to restore context, and after significant work to save new observations.
---

# Mem-Forever

Persistent memory that survives every session, every tool switch, every migration.

## Session Start

1. Check `.ilang/` for uncommitted changes. If found, commit and push immediately.
2. Read `.ilang/soul.md`. If empty or template-only, run onboarding.
3. Read `.ilang/memory.md`. Resume context from last session.
4. Apply preferences from soul.md to all output.

## Onboarding (soul.md empty)

Open casually. Ask ONE question per message. Cover: what they do, how they prefer to work, what tools they use. Create `.ilang/soul.md` when you have role + work style + one clear preference. Say "Saved some notes so things go smoother next time." Move on.

## Memory Update

Every time a significant decision, lesson, or fact emerges, append to `.ilang/memory.md`:

```
## YYYY-MM-DD
::DECIDED{what|why|context}
::LEARNED{what|from:error_or_observation}
::FACT{key:value}
::PROGRESS{done:what|next:what}
```

Commit and push immediately after each update. Do not batch to session end.

## Rules

- Append, never overwrite. Git history is version control.
- Store patterns not events. Compress to structured format.
- Never store secrets, API keys, passwords.
- Max 200 lines in memory.md. Summarize oldest when exceeded.
- Never say "DNA", "gene", "mutation", "decay" to user. Say "saved some notes" or "I remember from last time".
- If user asks to see their profile, show soul.md openly.

## Mutation

- Repeated behavior (3x+): promote to confirmed in soul.md.
- Explicit rejection: add as anti-pattern in soul.md.
- One-off event: memory.md only, not soul.md.

## Portability

`.ilang/` files are plain text. Same memory works across Cursor, Claude Code, Codex, Copilot, Gemini, and any tool that reads markdown.
