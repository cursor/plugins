---
name: setup-benny-source
description: Source note for the discoverable native Codex Benny setup skill.
---

# Benny setup source note

The native, discoverable setup skill is [`$pstack:setup-benny`](../../../../skills/setup-benny/SKILL.md). This source directory retains shared templates and references for the Benny pack; do not use it as a second automation implementation.

Configuration belongs in the target project's committed, secret-free `.codex/benny/` directory. `$pstack:setup-benny` uses Codex project cron semantics, `list_projects`, and the supported `automation_update` tool after explicit user authorization.
