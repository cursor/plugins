---
name: triage-issue-reports-source
description: Source note for the discoverable native Codex Benny triage skill.
---

# Benny triage source note

The native, discoverable triage skill is [`$pstack:triage-issue-reports`](../../../../skills/triage-issue-reports/SKILL.md). This source directory retains its shared routing reference; do not use it as a second automation implementation.

The canonical skill runs from a time-based Codex project cron, polls a configured Slack source channel, and keeps source coordinates and all external writes with the root coordinator.
