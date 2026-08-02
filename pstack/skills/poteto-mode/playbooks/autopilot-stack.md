### Autopilot-stack

**You own the build and verification. The operator owns the landing.** Use this when a queue must become one linear Graphite stack and the operator will review and land it herself.

1. Frame the ordered changes and the final done predicate. Start one root-owned decision trail through the **show-me-your-work** skill. Name the intended parent of every change before work starts.
2. Give each change one Cursor cloud agent owner. Owners use the Autopilot-full build loop: implement, verify the real artifact, run the **no-comments** skill before review, address feedback, and report `CHANGE-READY <branch> <head-sha>` with evidence. Owners do not run topology-changing `gt` commands, merge, or enable auto-merge.
3. The root swarm-verifies each reported SHA through the **swarm** skill. A self-report is not a verdict. Record `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE` for the exact SHA and send failures back to the same owner.
4. Append verified changes in order. The root alone runs `gt track --parent <previous-branch>`, `gt restack`, and `gt submit --stack`. Never let concurrent owners edit Graphite topology.
5. Restacking or review fixes can move one or more SHAs. Re-run exact-SHA verification for every moved head and every dependent PR whose effective diff changed. An earlier verdict does not cover a new patch.
6. Run Cursor's built-in **babysit** skill across the submitted stack until each PR has clear checks, reviews, and threads. Keep all merge and auto-merge controls off. The terminal state is a reviewed stack, not merged PRs.
7. The root reports `STACK-READY` with the ordered PR URLs, parent links, final SHAs, and verification evidence. The operator reviews and lands the stack. The root and owners stop there.
8. Audit owners and remote heads every 30 minutes with a cloud-agent status / liveness probe. Honor `state then wait`, `hold`, and `stand down` exactly as Autopilot-full does.

Choose Autopilot-full when the PRs are independent and the operator authorizes their owners to merge. Choose Autopilot-stack when ordering matters or the operator wants one reviewable stack and will land it herself.

**Reply:** the ordered stack, final SHAs, verification evidence, review state, and anything the operator must resolve before landing.
