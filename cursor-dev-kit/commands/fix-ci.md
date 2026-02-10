---
name: fix-ci
description: Find failing CI jobs, inspect logs, and apply focused fixes
---

# Fix CI

1. Identify the latest run for the current branch.
2. Inspect failed jobs and extract the first actionable error.
3. Apply the smallest safe fix.
4. Re-run CI and repeat until green.
