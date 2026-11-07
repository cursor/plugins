---
description: "Session pickup"
---

### Session pickup

Read [the shared policy](../../../docs/core.md) and the current client adapter first. Its scope gates, model routing, worker limits, and required-capability rules govern this playbook. Personal-style cleanup and external integrations are optional; historical large-fan-out recipes require explicit approval.

**You own the resume point. Read the prior trail, don't redo it.**

1. Locate an explicitly supplied capsule, approved current-session transcript, host-supported history result, or branch. Do not infer private cache paths or scan unrelated chats. Transcript mining is opt-in. Read metadata and recent messages first, then relevant decision points. Handle a small trail directly; resolve an exploration worker only for a substantial independent slice.
2. Reconstruct operational state. The branch and worktree, what already landed (`git log`, `git diff` against the base), the open todos, the decisions made. The prior trail is authoritative input. Resist the bias to re-derive it.
3. Diff done vs pending. Compare what shipped against what was planned, name the resume point, do not re-run the prior repro or redo completed work. A "let me verify from scratch" pass means you're treating the trail as untrustworthy when it's authoritative.
4. Route the remaining work to the matching playbook and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. The pickup playbook ends here. The routed playbook owns the rest.
5. Verify the inherited claims against the original goal on the real artifact (the **principle-prove-it-works** skill). A passing prior self-report is not the proof.

**Reply:** where the prior agent stopped, what you inherited vs redid (ideally nothing redone), the resume point, and the outcome.
