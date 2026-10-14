# Workflow checklist

### Bug fix

**You own this task. Plan, review, verify.** Delegate investigation and the fix to subagents, stay in the lead. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section.

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more.

1. Reproduce it yourself on the matching surface via the control skill (Non-negotiables), even when a debug or instrumentation protocol says to ask the user to reproduce. Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
2. Binary-search the cause. Form the candidate hypotheses, then rule them out until one survives. Seed them with `how` over the affected subsystem and the **why** skill for regression history. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, add instrumentation or logging and read it as the code runs. Don't guess. Drive a long or stubborn hunt with Cursor's `/loop` command. Confirm the surviving *mechanism* with runtime evidence before the step-3 architect/interrogate fan-out.
3. Plan the fix. If it crosses a function boundary, `architect` first. Delegate implementation to a subagent using your configured bug-fix model (default `grok-4.7-xhigh-fast`) with a specific scope.
4. Verify on the same surface. The original repro now passes. "Inconclusive" or wrong-surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence.
5. Stage the commits so the failing repro lands before the fix in git history. See the **tdd** skill for the failing-test-first cadence when the bug has a cheap local test path. Skip it when the test would be expensive, integration-heavy, or unclear.
   This is the canonical **sequence-verifiable-units** principle skill, the failing test first and the fix on top.
6. Run **Opening a PR**.

**Reply:** what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.


Architect: Ground, Sketch, Agree, Implement, Scrap.
Arena: Frame, Fan out, Cross-judge, Pick, Graft, Verify.
Why: Anchor, discovery, investigators, synthesizer, present.

Step 5 skip: user prohibits commits. Existing check supplies cheap red-first proof.
Step 6 external operations skip: user prohibits integrations and PRs. Local review remains required.

Initial reproduction: node check.mjs failed with actual -2, expected 8.
Anchor: sample.js:1-2, add; bbc4c0d160ae5c044a3a3d858adc1c046526e175, message fixture; no PR or ticket identifiers.
Coverage discovery: Available tool metadata includes GitHub for source control and issues, Google Drive and ChatGPT Space for long-form documents. Those external categories are skipped because the user prohibits all external integrations. No matching team-chat, infrastructure-observability, exception-tracking, or analytics tools are identified for this fixture; those categories remain gaps. Sites tools relate to hosted applications, not this isolated fixture, and are not consulted. Local git source control remains available. No gh query needed because no PR identifiers.
Models: inherit parent for every seat. Distinct candidate and judge stances replace model-family diversity.
Permissions: investigator read-only is a prompt scope, not sandbox isolation.
Rubric: caller compatibility, numeric correctness contract, smallest API, single ownership, maintainer readability. Score each 0-2.

Ground done via native simple how explainer. Why done via read-only native source investigator and fresh synthesizer. Runtime elimination confirms operator mechanism before implementation.
Architect Sketch and Arena Frame/Fan out/Cross-judge/Pick/Graft done. Parent read all candidates end to end and agrees with judge 10 vs 8. No structural graft. Agree proceeds automatically, no checkpoint requested.
Control adaptation: direct local Node process is the matching fixture surface; no installed Cursor control-cli dependency is assumed.

## Final checklist

- [x] 1. Reproduce it yourself. Matching Node surface failed before the fix. Full stderr in before.txt.
- [x] 2. Binary-search the cause. Native investigator eliminated wrong import, coercion and wrong assertion, confirming operator mechanism.
- [x] 3. Plan the fix. Architect Ground, Sketch and automatic Agree complete. Fresh implementation delegate followed selected contract.
- [x] 4. Verify on the same surface. Delegate and parent observed original check passing. Parent reviewed diff and literal numeric probes.
- [ ] 5. Stage the commits so the failing repro lands before the fix in git history. skip: user prohibits commits. Existing behavioral check supplies red-first evidence in local files.
- [ ] 6. Run Opening a PR. skip: external operations, worktree git writes, commits, forge calls, pushes and PR creation prohibited by fixture. Opening-a-PR instructions read completely. Applicable local no-comments review and prose checks performed. Deslop before commit skipped because no commit occurs and Cursor dependency unavailable.
- [x] Architect Implement. No signature or contract deviation.
- [x] Architect Scrap assessed. No friction pattern or trigger, so no redesign needed.
- [x] Arena Verify. Actual implementation passes unchanged behavioral check. No dropouts or structural grafts.
- [x] Why Present. Full confidence-separated synthesis recorded in why.md with all seven coverage categories and change constraints.
- [x] No-comments. One scoped narration deletion accepted after diff inspection. No restorations, reruns, constraint encodings or open findings.

Principles applied. Laziness Protocol kept the direct API and one operator fix. Model the Domain retained numeric scalars without an object. Fix Root Causes corrected the measured subtraction mechanism. Prove It Works required the original actual Node check. Exhaust the Design Space kept two distinct native candidates. Separate Before Serializing Shared State gave candidates separate directories. Sequence Work into Verifiable Units preserved failing-before then passing-after evidence without forbidden commits.
