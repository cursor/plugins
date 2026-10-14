---
name: principle-guard-the-context-window
description: "Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads."
disable-model-invocation: true
---

## Host binding for this installation

Before executing this skill, resolve its actual installed location and the calling project. Read the compatible installed `pstack-host/HOST.md` and run its preflight as described there with this skill directory. Project copies take precedence over global copies. If pstack-host is missing, stop and show a supplement command selecting pstack-host from the repository recorded in this skill’s `pstack-source.json`. The host binding overrides Cursor-only tools, model slugs and plugin paths below; retain the full task and workflow instructions. Never write project state into this installed directory.

# Guard the Context Window

**Why:** Context overflow degrades reasoning quality, creates compression artifacts, and halts progress.

**Pattern:**
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for mechanism costs.
