### Autopilot-full

**You own the queue through merge.** Use this when the operator authorizes full autonomy over a queue of independent PRs. One owner carries each PR from build through merge. The root coordinates, audits, and countersigns. It never takes a PR away from its owner.

1. Frame the queue. Record the ordered PR list, the done predicate, dependencies, and any irreversible boundary. Start one canonical decision trail with the **show-me-your-work** skill. The root is the only writer to that trail; owners return evidenced checkpoints for it.
2. Assign exactly one Cursor cloud agent as owner for each PR. Each brief includes the request, scope, base branch, verification command, and the full owner loop below. Independent changes branch from `main`, register with `gt track --parent main`, and submit independently. Do not turn independent PRs into a stack.
3. Each owner runs the matching poteto-mode playbook and owns every fix needed to reach merge-ready:
   - build the smallest complete change;
   - verify it on the real artifact;
   - open or update the PR with `gt submit`;
   - run the **no-comments** skill before review, fix accepted findings, and resubmit;
   - fetch current trunk and run `gt restack` unconditionally, then resubmit;
   - run Cursor's built-in **babysit** skill until reviews, checks, conflicts, and actionable feedback are clear.
4. The owner reports `MERGE-READY <pr-url> <head-sha>` with the test evidence and review state. The root rejects a report without the exact remote head SHA. A self-report is a handoff, not a verdict.
5. The root swarm-verifies every merge-ready head through the **swarm** skill. Fresh verifiers inspect the diff at the reported SHA, run the relevant checks, and return `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE` with evidence. Compare `git patch-id` at the verdict SHA against the current head before trusting an older verdict; a new head voids the verdict unless the patch-id is unchanged.
6. The root records the verdict and sends `COUNTERSIGNED <pr-url> <head-sha>` only for a verified head. The owner confirms that the remote head still matches the countersign, then squash-merges its own PR. No root process or sibling owner merges it. A failed or stale merge returns to step 3.
7. The root audits the whole queue every 30 minutes. Use a cloud-agent status / liveness probe, inspect remote PR heads and checks, wake stalled owners with the missing predicate, and replace a dead owner with a new owner brief that includes the decision trail. Log the audit even when nothing changed.
8. Stop only when every queued PR is merged or the operator invokes a gate:
   - `state then wait` means report each owner, PR, SHA, verdict, and blocker, then wait without changing state;
   - `hold` means owners may build and verify, but nobody merges;
   - `stand down` means stop new work and merges, checkpoint every owner, and return the resumable queue state.

**Reply:** the queue, owner map, countersigned SHAs, merged PRs, verification evidence, and any held or unresolved item.
