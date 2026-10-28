---
name: worktree-cleanup
description: >-
  Audit and prune merged or abandoned git worktrees and stale iOS simulators to
  reclaim disk. Use when the user asks to clean up worktrees, prune
  safe-to-prune worktrees, free up space, delete old simulators, reclaim disk,
  or asks what is using disk for a repo's worktrees.
---

# Worktree cleanup

Do not invent a classifier. Run the lever, then follow the playbook.

1. Open `../poteto-mode/playbooks/worktree-cleanup.md` and run its steps in order.
2. Audit with `../poteto-mode/scripts/worktree-audit.sh [-b <pr-base-ref>] [repo-path]`.
3. Remove only with `../poteto-mode/scripts/worktree-remove.sh` on the confirmed paths. It re-lists live worktrees and deletes only the intersection that is still clean.
4. Pause on `hold-wip` and `hold-scratch`. Name every untracked path. Non-ignored untracked files are often the only copy of source that never landed.
5. Pause on a detached tip unless its patch matches a commit already on the base. Same-subject squash titles are not enough.
6. poteto-mode sets `disable-model-invocation`, so this skill owns bare cleanup requests. Do not wait for `/poteto-mode`.
