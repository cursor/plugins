### Eval

**You own the experiment design. Plan, blind, run, synthesize.**

Evals are blinded, one-shot bakeoffs for deciding whether to promote or reject a change: a new skill variant, a structural change, a prompt tweak. Each trial gets one clean attempt with no feedback or repair. This is not a standing regression suite or a CI merge gate.

**Non-negotiables for blinding and isolation:**

- No `eval`, `test`, `judge`, `experiment`, `rubric`, `score`, `compare`, `benchmark`, `candidate`, or `arena` in any directory, file, or prompt the candidate sees.
- The candidate prompt looks like an organic user request. State the goal, not the meta. "build me a small todo cli" not "show me how you follow the principles chain".
- No chain-eliciting cues. Don't ask the candidate to list which skills, principles, or files they applied; that meta-prompt inflates citation behavior. Ask for design notes generally and grade chain-following from code shape, not self-report.
- Sanitize directory, slug, and arm names. Use project-shaped names a user might pick, not labels like `candidate-1`, `agent-a`, `control`, or `skill-off`.
- Don't tell the candidate other candidates exist.
- The judge can know it's judging but sees outputs by sanitized label only, never by model name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from. Two judge runs with different prompts don't compare, the calibration drifts.
- Start each trial in a fresh workspace and preferably a new session. Clear prior chat and give it no sibling memory. Never plant prior transcripts, judge notes, or sibling outputs.

**Steps:**

1. **Frame.** State the variant and the promote-or-reject claim. Write a judge-only rubric with 3-6 concrete criteria. Grade task success and the intended behavioral shape. Never make a turn-1 skill load, a particular file read, a citation, or "did the skill trigger?" a pass condition.
2. **Author an organic prompt set.** Include at least one task where the behavior should apply. If the variant changes a description, routing, sticky behavior, or when-to-apply rule, include at least one task where it should not engage and add false-positive cost to the rubric. Write what a user would type, with no leakage of what is measured. If the task prompt itself is the target, write matched current and proposed versions here; otherwise every arm gets the same prompt.
3. **Build comparison arms.** Variant gets the proposed skill, structure, or prompt. Control gets the current version. For skill presence or content changes, the control may be skill-absent when absence is the realistic baseline, otherwise the prior skill. Hold the project skeleton, model mix, and every non-target input constant. The control is another sanitized label. Promote only when the variant beats the control on the rubric.
4. **Set up isolated trials.** Fresh per-trial workspace with only that arm's variant and organic-task context. Identical project skeleton across arms. A fresh workspace does not clear skills from workspace `.cursor/skills/`, user `~/.cursor/skills/`, or plugin installs: for a skill-absent arm, isolate or disable every candidate-visible copy, preflight resolved sources, and fail setup if the skill remains visible. Record each trial's workspace path and transcript ID as orchestrator-only metadata. Cheap deterministic preflights aid synthesis only; they never replace the blinded rubric.
5. **Run 2-3 one-shot trials per prompt and arm.** Launch each runner directly in its recorded workspace with that arm's isolated context. Fan out in parallel with no shared grounding and no candidate-visible files across workspaces. Match model and trial pairings across arms. Ask only for the organic task output, not a graft rationale. Missing output fails the trial. No retries, coaching, or repair. When budget binds, prefer 2 trials on fewer models over 1 on many.
6. **Spawn one blinded judge** on a different model family after every trial finishes. In one pass, score every output by randomized sanitized label against the same rubric. Mark each criterion and output pass or fail. Do not run the arena pick/graft workflow. This bakeoff ends at arm-level scoring.
7. **Inspect transcripts after scoring to explain how, not to decide pass or fail.** Read only the recorded transcript for each trial from that workspace's transcript directory (normally `~/.cursor/projects/<trial-workspace-slug>/agent-transcripts/`), using the session or transcript ID from setup. Derive the slug from the recorded workspace path. Do not glob across `~/.cursor/projects/*/` or open unregistered workspaces. Transcripts verify isolation and explain the output. They are not a pass gate.
8. **Read every output yourself** end to end. Report pass rates by arm and prompt, then compare with the judge. Promote only when the variant beats the control overall without adding false positives. Otherwise reject. Explain disagreements as judge bias, contamination, or rubric ambiguity.

**Related:** Shipped skills may keep a separate standing regression pack of 5-20 cases. It is distinct from this bakeoff.

**Reply:** variant and control, prompt set, rubric, trial pass rates, per-candidate notes, judge's verdict, your synthesis, and the promote-or-reject decision.
