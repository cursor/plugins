---
description: "Verify and hand off or ship an explicitly authorized change"
---

# Shipping

Read [the shared policy](../../../docs/core.md) and the current client adapter.

1. Confirm the scope and authorization. Building a change does not authorize
   commits, pushes, PR comments, merges, or rewriting history. Without the
   corresponding grant, verify locally and hand off.
2. Use the project's existing forge tooling, normally `gh` for GitHub. Inspect
   the exact head, base, required checks, and existing review evidence. An
   optional forge adapter must not become a core dependency.
3. Verify the user-visible behavior with bundled or project-provided tools.
   Use an independent reviewer where the risk warrants it, within configured
   worker limits and with verified model/tool selection. The parent runs shell
   checks; read-only reviewers inspect the diff and evidence. Neither green CI
   nor an author's summary alone proves the behavior.
4. For a dependent stack, start at the lowest unmerged change and stop at the
   first unverified one. Evidence names the head and base it covers. A rebase
   can preserve a patch identity, but changes to dependencies, merge results,
   or verification tooling require fresh relevant checks.
5. With explicit merge authorization, land bottom-up using the project's
   supported merge method. Read the forge state back: queued or auto-merge
   requested is not merged. Retargeting, rebasing, and publishing each next
   branch require their own scope grant. Never silently force-push.
6. Stop at the approved ceiling. Use an available finite watcher or host event
   facility if requested. Cursor `/loop`, cloud agents, and external UI-control
   plugins are not prerequisites; a local worktree is not a cloud VM.

**Reply:** verified heads, commands and results, reviewer provenance, what
actually landed, what remains blocked, and any manual publishing steps.
