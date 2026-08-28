---
name: no-comments
description: Explicitly run the read-only Comment Sicko reviewer, fix accepted comment findings, and offer enforceable encodings for claimed constraints.
---

# No comments

Spawn Comment Sicko. Act on accepted findings.

Authoring agents defend comments. Defer to Comment Sicko's fresh perspective.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base branch, default `main`, including the working tree.

## Steps

1. Spawn the `pstack_comment_sicko` custom agent and pass the scope. It is read-only and returns a report; do not ask it to edit. If the custom agent is unavailable, spawn Terra (`gpt-5.6-terra`, `xhigh`, `fork_turns: "none"`) with the same read-only review contract. Wait for it with `wait_agent`.
2. Inspect its report. Reject scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and flags that treat kept intentional code as guilty. Reshape flags on our-code surprises stay actionable. A keep survives only with proof it is about something we cannot change. Audit missed scoped lint and TypeScript suppressions. Correctness or safety suppressions stay actionable `MUST KILL`s. Before accepting thin `IMPORTANT` or `do not remove` kills or keeps, run **how** or **why** on their symbol. If a kill is ambiguous, do not restore. If a keep is refuted or still ambiguous, delete it. Use `followup_task` once to rerun a rejected report with the failure named. Reject a second bad report, report it open, and fail the workflow.
3. Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. If any fix needs a shape, run `/architect` once for the accepted set and surrounding code. Stop at the sketch. Architect shapes. Step 4 implements.
4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open. The **principle-fix-root-causes** and **principle-redesign-from-first-principles** skills guide intent only: fix real causes, redesign as if requirements always existed, never bolt on symptom guards. Neither authorizes widening the fence nor fixing instances outside it.
5. Constraint comments say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. Offer the cheapest in-scope type, runtime, test, or CI lint. Wait for explicit approval before adding that enforcement unless it was already part of the user's request. If approved, encode then delete. Otherwise delete the unsupported comment, report the constraint open, and sketch out-of-scope work.
6. Report the deletion count, restored comments, reruns, architect sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.
