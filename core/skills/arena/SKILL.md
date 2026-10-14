---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
---

# Arena

Fan out N parallel attempts at the same task. Read every candidate end to end. Pick the strongest as the base. Graft the best ideas from the others into it. Verify the synthesized result.

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Cross-judge
4. Pick
5. Graft
6. Verify

## Phase A: Frame

The N candidates will receive the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing. When the caller supplies a runner prompt, that
   prompt fixes the deliverable list and the task text may not add to it. Appending "and a complete
   working implementation" to a design-sketch brief converts the bakeoff into N implementations
   without anything reporting that it happened.
2. Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. The rubric is the picker's tool in Phase D. Candidates only see the task.
   Every criterion must be scoreable against the artifact named in step 1. Check each one against the
   runner prompt before spawning. A criterion needing run output, a benchmark, or a passing suite is
   unscoreable when the runners are producing design sketches, and it does not fail loudly: the
   runners quietly ship full implementations to satisfy it, and the bakeoff pays implementation cost
   N times over.
   Write the rubric to a file before the spawn message, and do not send the spawn until it exists. A rubric written after the candidates are running shaped nothing, and a record claiming otherwise is false.
3. Pick the runners. A roster the caller supplies wins. Architect passes `architect-runners`, and
   that list is the runner set for this invocation whatever `arena-runners` says. Without a caller
   roster, use `arena-runners` from `.pstack/models.md` when present. Otherwise default to one each on the `panel` pool (see `runtime/roles.md`). An `auto`, `inherit-parent`, or `inherit` entry in this roster or the cross-judge roster means the parent model: omit `model`. If the host rejects a configured entry, use the role's class default from `runtime/roles.md` and report the substitution. Where the host supports model families, prefer the same family; if it rejects the default, use the closest valid identifier of that family from the host's error message. Otherwise use a confirmed available class default. Never treat an inheritance alias as a rejected identifier. Spawn more when the arena covers multiple design directions. Same model N times when the work is generation-bound rather than judgment-sensitive.
4. Assign output paths. Each candidate writes to its own location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Spawn all N subagents in one message with `detached: yes`, each with the task, the path to the shared grounding, its own output path, and instructions to produce both the artifact and a short rationale.

Each rationale names the alternatives the candidate considered and what it rejected.

Each brief forbids reading any sibling's output path. Where the host offers worktree isolation, write candidates get it (see `runtime/delegation.md`).

If a candidate fails to produce output, proceed with N-1 and note the dropout in the synthesis record.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one model from the `arena-cross-judge` in `.pstack/models.md` when present. Otherwise use the `panel` pool (see `runtime/roles.md`). Prefer a different model family from the parent's. Where the host has only one family, pick the
model furthest from the parent's on any axis you do have (a different model, or the same model at a
different reasoning effort), give the judge the `adversary` stance, and record in the synthesis note
that the cross-judge was same-family. Same-family agreement is weaker evidence than cross-family
agreement, and the note is what stops a reader over-reading it. Spawn one readonly judge subagent on that model. It sees the rubric and the candidates by path label and nothing else: not your measurements of them and not your leaning. A judge handed your numbers anchors on them, and some of yours will be wrong. It scores each criterion and recommends a base with rationale. It runs in parallel with the parent's reading in Phase D, not with the candidates themselves. Don't spawn the judge while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking: every file it produced, its rationale included. Do it while the cross-judge runs. That window is otherwise idle.

Score each candidate against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base on which candidate a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller API when two feel tied, per the Laziness Protocol.

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E: Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per the **redesign-from-first-principles** principle skill. Don't paste mechanically. The result has to remain coherent under one mental model.

Record what was grafted, from which candidate, and what was rejected and why.

When N candidates converge on the same shape, that is a strong agreement signal. Note the convergence in the record and ship the consensus shape. No graft is needed. When N candidates wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

The synthesized artifact has to hold up under the same scrutiny as any other output, per the **prove-it-works** principle skill.

Verify the kind of artifact the runners produced. Working code is verified by running it. A design
sketch is verified as a sketch: its usage and types agree, every rubric criterion holds, and it
clears the design red flags. Runtime proof of a sketch belongs to whoever implements it (Architect
Phase D, or the caller's implementation step), and `synthesis.md` says so instead of claiming a
runtime pass.

If verification surfaces a problem the arena did not catch, either Phase A was wrong (re-frame and re-run) or one candidate caught it and you missed the graft (go back to Phase E). Don't paper over.

## Outputs

One synthesized artifact. One synthesis note beside it, in a file named `synthesis.md`, carrying:

- the base, and why it won;
- each graft with its source candidate, and each rejection with its reason;
- the cross-judge's verdict, and a same-family line whenever the judge shared the parent's model family;
- dropouts, if any;
- the verification result.

Every statement in the note that a step happened must be true. Writing "rubric written first" or "read end to end" about a step that did not happen is worse than leaving the line out.
