---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

Open a todolist with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. The rubric is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners. First read [model routing](../../docs/model-routing.md) and use the matching harness profile's `arena runners` entries. Code-writing candidates use native subagents unless an external writer was explicitly selected with a separate checkout. With no profile, use the legacy `arena runners` line or one each on `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast` in Cursor; in another harness use native `inherit-parent` seats. An `auto` or `inherit-parent` entry omits native `model`. If a slug is rejected, report it and use a confirmed fallback. Spawn more when the arena covers multiple design directions; use the same model N times when generation matters more than independent judgment.

Pick each subagent's reasoning level and speed for the job using the confirmed controls from the matching harness profile, per the Subagents section of **poteto-mode**.

4. Assign output paths. Each candidate writes to its own location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Spawn native candidates with the active harness's subagent tool (in Cursor, one message with `run_in_background: true`). Give each the task, the path to shared grounding, its own output path, and instructions to produce both the artifact and a short rationale. Dispatch explicitly configured external candidates through their confirmed runner in separate checkouts, then drain all candidates before judging.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one confirmed entry from the matching profile's `arena cross-judge pool` using [model routing](../../docs/model-routing.md), preferably a different family from the parent's. A native entry uses a readonly subagent; a confirmed external entry uses its read-only runner. With no profile, use the legacy rule or `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast` in Cursor; in another harness use a native `inherit-parent` judge and report the lack of cross-family review. The judge sees the rubric and candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with the parent's reading in Phase D, not with the candidates. Don't launch it while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
