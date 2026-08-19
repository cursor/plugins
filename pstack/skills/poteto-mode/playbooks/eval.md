### Eval

**You own the experiment design. Plan, blind, run, synthesize.**

Evals test how a change affects agent behavior before promoting it: a new skill variant, a structural change, a prompt tweak. The failure mode is the observer effect. An agent that knows it's being evaluated behaves differently, so candidates must run blind.

**Non-negotiables for blinding:**

- No `eval`, `test`, `judge`, `experiment`, `rubric`, `score`, `compare`, `benchmark`, `candidate`, or `arena` in any directory, file, or prompt the candidate sees.
- The candidate prompt looks like an organic user request. State the goal, not the meta. "build me a small todo cli" not "show me how you follow the principles chain".
- No chain-eliciting cues. Don't ask the candidate to list which skills, principles, or files they applied; that meta-prompt inflates citation behavior. Ask for design notes generally and grade chain-following from code shape, not self-report.
- Sanitize directory and slug names. Use project-shaped names a user might pick, not labels like `candidate-1` or `agent-a`.
- Don't tell the candidate other candidates exist.
- The judge can know it's judging but sees outputs by sanitized label only, never by model name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from. Two judge runs with different prompts don't compare, the calibration drifts.

**Steps:**

1. **Frame.** State what variant is under test and what behavior counts as success. Write the rubric (3-6 concrete criteria) for the judge only. Hold it back from candidates.
2. **Set up sanitized environments.** Per-candidate working dir with the variant in place. Plant any context an organic task would have: a project skeleton, the skills the candidate would naturally read.
3. **Author one organic prompt.** What a user would type. No leakage of what's being measured.
4. **Launch N parallel candidates** per the **arena** skill's Phase B. Use confirmed distinct models when configured; otherwise run independent candidates inheriting the parent model. Each works in its own sanitized dir with the same prompt. Record the actual diversity and never label repeated parent-model runs as cross-model evidence.
5. **Launch one blinded judge** per the **arena** skill's Phase C. Prefer a distinct confirmed model family; otherwise use a separate delegate inheriting the parent model. The judge sees outputs by sanitized label and the rubric, never a model name. If independent delegation is unavailable, mark judging `UNAVAILABLE` and do not promote from this run.
6. **Verify the chain from transcripts, not self-report.** When the host exposes each candidate's active-workspace transcript, read it and inspect which files the candidate actually opened. Never guess transcript paths or scan other workspaces. If transcripts are unavailable, grade only observable file access and output behavior and mark chain-following as unverified. Citing a principle is not reading its leaf skill, and reading it is not applying it.
7. **Read every candidate output yourself** end to end. Compare to the judge's verdict. Disagreement means a reviewer may be biased or the rubric may be ambiguous. Synthesize.

**Reply:** variant under test, rubric, per-candidate notes, judge's verdict, your synthesis, and a recommendation for whether to promote the variant.
