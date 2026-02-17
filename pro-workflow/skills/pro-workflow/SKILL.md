---
name: pro-workflow
description: Core workflow patterns for AI-assisted coding. Self-correction loops, context discipline, 80/20 review, parallel worktrees, and learning logs. Use when starting a session or setting up workflow habits.
---

# Pro Workflow

Real-world patterns from power users who ship production code daily. Every pattern reduces correction cycles.

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." — Karpathy

## Patterns

### 1. Self-Correction Loop

The single most powerful pattern. When corrected:

1. Acknowledge specifically what went wrong.
2. Propose a rule: `[LEARN] Category: One-line rule`
3. Wait for approval, then persist to LEARNED section.

Trigger phrases: "Add that to your rules", "Remember this", "Don't do that again"

```
User: You edited the wrong file
AI: I edited src/utils.ts when you meant src/lib/utils.ts.
    [LEARN] Navigation: Confirm full path before editing files with common names.
    Should I add this?
```

### 2. Parallel Sessions with Worktrees

Zero dead time. While one session thinks, work in another.

```bash
git worktree add ../project-feat feature-branch
git worktree add ../project-fix bugfix-branch
```

| Scenario | Action |
|----------|--------|
| Waiting on tests | Start new feature in worktree |
| Long build | Debug issue in parallel |
| Exploring approaches | Try 2-3 simultaneously |

### 3. Wrap-Up Ritual

End sessions with intention: audit changes, run quality gates, capture learnings, write a summary, note what's next.

### 4. Split Memory Architecture

For complex projects, modularize into:
- `AGENTS.md` — Workflow rules (planning, subagents, quality gates)
- `SOUL.md` — Style preferences (concise, action-oriented, no over-engineering)
- `LEARNED.md` — Auto-populated from corrections

### 5. 80/20 Review

Batch reviews at checkpoints, not every change:
- After plan approval
- After each milestone (>5 file edits)
- Before destructive operations (git push, deploy)
- At wrap-up

Between checkpoints: proceed with confidence.

### 6. Model Selection

| Task | Model |
|------|-------|
| Quick fixes, linting | Fast |
| Features, refactors | Default |
| Architecture, hard bugs | Advanced + extended thinking |

### 7. Context Discipline

- Read before edit. Always.
- Plan mode when: >3 files, architecture decisions, multiple approaches.
- Compact at task boundaries (after planning, after a feature, when switching domains).
- Keep MCP servers under 10, tools under 80 total.
- Use subagents to isolate high-volume output (tests, logs, docs).

### 8. Learning Log

Auto-document insights: `[LEARN] Category: Rule`. Categories: Navigation, Editing, Testing, Git, Quality, Context, Architecture, Performance. Patterns compound over time — a correction today prevents the same mistake tomorrow.

## Quick Setup

Add to your project memory:

```markdown
## Self-Correction
When corrected, propose rule → add to LEARNED after approval.

## Planning
Multi-file: plan first, wait for "proceed".

## Quality
After edits: lint, typecheck, test.

## LEARNED
<!-- Auto-populated through corrections -->
```

## Philosophy

1. **Compound improvements** — Small corrections accumulate into big gains
2. **Trust but verify** — Let AI work, review at checkpoints
3. **Zero dead time** — Parallel sessions via worktrees
4. **Memory is precious** — Yours and the AI's
