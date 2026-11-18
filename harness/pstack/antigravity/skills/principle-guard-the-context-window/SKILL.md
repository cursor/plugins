---
name: principle-guard-the-context-window
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /principle-guard-the-context-window (or names 'principle-guard-the-context-window') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads."
---

# Guard the Context Window

**Why:** Context overflow degrades reasoning quality, creates compression artifacts, and halts progress.

**Pattern:**
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for mechanism costs.
