---
name: arena
description: Run parallel candidates on the same non-trivial artifact, select a base, graft the strongest ideas into it, and verify the synthesis.
---

# Arena

Fan out N parallel attempts at the same task. Read every candidate end to end. Pick the strongest as the base. Graft the best ideas from the others into it. Verify the synthesized result.

## Start

Use Codex's plan tool to track one item per phase before launching anything.

1. Frame
2. Fan out
3. Cross-judge
4. Pick
5. Graft
6. Verify

## Phase A: Frame

The N candidates will receive the same prompt, so the prompt is the contract. Get it right before spawning anything.

1. State the artifact each candidate is producing.
2. Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. Concrete: `Adds a --dry-run flag that skips writes`. Vague: `code is correct`. The rubric is the picker's tool in Phase D; candidates only see the task.
3. Pick the runners. The default panel is one `xhigh` runner each: Spark (`gpt-5.3-codex-spark`) for a bounded minimal candidate, Luna (`gpt-5.6-luna`) for search-heavy or mechanically broad coverage, Terra (`gpt-5.6-terra`) for the conventional maintainable candidate, and Sol (`gpt-5.6-sol`) for the architecture-heavy candidate. Apply an authorized global AGENTS override when present. Spawn more only when the user asks or the arena has more independent design directions.
4. Assign output paths. Each candidate writes to its own location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`). N candidates writing to the same path is shared mutable state and fails the **separate-before-serializing-shared-state** principle skill test.

## Phase B: Fan out

Call Codex `spawn_agent` for every candidate without waiting between calls. Use the matching `pstack_spark`, `pstack_luna`, `pstack_terra`, or `pstack_sol` custom agent when installed. Otherwise pin the corresponding model with `reasoning_effort: "xhigh"` and `fork_turns: "none"`. Give each agent the task, the shared grounding path, exclusive ownership of its output path, and instructions to produce both the artifact and a short rationale. State that other agents share the filesystem and must not edit or revert another candidate's output.

After spawning, drain results with `wait_agent` using long waits. A timeout is not a completion or dropout. Use `followup_task` for a bounded revision to an existing candidate; do not invent resume IDs, background handles, cloud branches, or undocumented agent states.

The rationale is mandatory. Without it, the parent cannot tell whether a candidate's structure is principled or accidental, which makes Phase E grafting unreliable. Each rationale names the alternatives the candidate considered and what it rejected.

If a candidate fails to produce output, proceed with N-1 and note the dropout in the synthesis record.

## Phase C: Cross-judge

After every Phase B candidate has completed, spawn a Sol `xhigh` cross-judge. Tell it explicitly not to modify files. It sees the rubric and completed candidates by path label, scores each criterion, and recommends a base with rationale. Run it concurrently with the parent's own Phase D reading. Never start the judge while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Skimming N candidates surfaces only the candidate whose surface looks most familiar.

Score each candidate against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base on which candidate a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller surface area when two feel tied, per the Laziness Protocol.

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E: Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per the **redesign-from-first-principles** principle skill. Don't paste mechanically. The result has to remain coherent under one mental model.

Record what was grafted, from which candidate, and what was rejected and why. The rejection notes are the highest-signal part of the record. Future readers learn from what you considered and dropped, not just what you kept.

When N candidates converge on the same shape, that is a strong agreement signal. Note the convergence in the record and ship the consensus shape. No graft is needed. When N candidates wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

The synthesized artifact has to hold up under the same scrutiny as any other output, per the **prove-it-works** principle skill. The arena does not earn you a pass.

If verification surfaces a problem the arena did not catch, either Phase A was wrong (re-frame and re-run) or one candidate caught it and you missed the graft (go back to Phase E). Don't paper over.

## Outputs

One synthesized artifact. One short synthesis note alongside, naming the base, the grafts (with source candidate), the rejections, the dropouts if any, and the verification result.
