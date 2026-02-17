---
name: pro-workflow
description: Core workflow patterns for AI-assisted coding. Self-correction loops, context discipline, 80/20 review, and learning logs. Use when starting a session or setting up workflow habits.
---

# Pro Workflow

Real-world patterns from power users who ship production code daily. Every pattern reduces correction cycles.

## The Core Insight

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." — Karpathy

## 8 Patterns

### 1. Self-Correction Loop

When corrected, acknowledge what went wrong, propose a rule (`[LEARN] Category: Rule`), and persist after approval. Corrections compound into a personal knowledge base.

### 2. Parallel Sessions with Worktrees

Zero dead time. While one session thinks, work in another:
```bash
git worktree add ../project-feat feature-branch
```

### 3. Wrap-Up Ritual

End sessions with intention: audit changes, run quality gates, capture learnings, write a one-paragraph summary.

### 4. Split Memory

For complex projects, modularize memory into AGENTS.md (workflow rules), SOUL.md (style preferences), LEARNED.md (auto-populated corrections).

### 5. 80/20 Review

Batch reviews at checkpoints (after plan approval, >5 file edits, git operations, auth/security code), not every change.

### 6. Model Selection

Match model to task: fast models for quick fixes, default for features, advanced for architecture and hard bugs.

### 7. Context Discipline

Read before edit. Plan before multi-file. Compact at task boundaries. Keep tools under 80 total.

### 8. Learning Log

Auto-document insights: `[LEARN] Category: Rule`. Patterns compound over time.
