---
name: reproduce-and-fix-issues-source
description: Source note for the discoverable native Codex Benny repro-and-fix skill.
---

# Benny reproduce-and-fix source note

The native, discoverable execution skill is [`$pstack:reproduce-and-fix-issues`](../../../../skills/reproduce-and-fix-issues/SKILL.md). This source directory retains the shared control-adapter, feature-map, and existing-fix references; do not use it as a second automation implementation.

The canonical skill runs from a time-based Codex project cron, polls a configured Slack source channel, and retains parent acceptance plus coordinator-only external writes.
