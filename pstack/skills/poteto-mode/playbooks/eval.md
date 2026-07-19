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
2. **Build the ablation arms.** When adding, rewriting, or supplying a skill, compare the variant with that skill absent. Use the prior version when absence would make the task artificial. Give both arms the same organic prompt and project skeleton. The control is just another sanitized label. Promote only if the variant-on arm beats the variant-off arm on the rubric.
3. **Author an organic prompt set.** Include at least one task where the behavior should apply. If the variant changes a description, routing, sticky behavior, or when-to-apply rule, include at least one task where it should not engage and add false-positive cost to the rubric. Write what a user would type, with no leakage of what is measured.
4. **Set up isolated trials.** Create a fresh per-trial workspace with only the arm's variant and context an organic task would have. Keep the project skeleton identical across arms. A cheap deterministic preflight may confirm setup facts, but it only aids synthesis. Regex or `should_trigger` checks do not judge task success or decide promotion.
5. **Run 2-3 one-shot trials per prompt and arm** through the **arena** skill's Phase B. Match the model mix across arms and run candidates in parallel. No retries, coaching, or repair. When budget binds, prefer 2 trials across fewer models over 1 trial across more models.
6. **Spawn one blinded judge** on a different model family per the **arena** skill's Phase C. In one pass, it scores every output by randomized sanitized label against the same rubric and marks each criterion and output pass or fail.
7. **Inspect transcripts after scoring to explain how, not to decide pass or fail.** Read each candidate's local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names this path). Do not glob across `~/.cursor/projects/*/`; that crosses workspace boundaries and reads private chats from unrelated projects. Use the transcript to verify isolation, see what the candidate read, and explain the output. It is synthesis evidence, not a pass gate.
8. **Read every output yourself** end to end. Report pass rates by arm and prompt, then compare your read with the judge's verdict. Promote only when the variant-on arm beats the variant-off arm overall without adding false positives. Otherwise reject it. Explain disagreements as judge bias, contamination, or rubric ambiguity.

**Related:** Shipped skills may keep a separate standing regression pack of 5-20 cases. It is distinct from this bakeoff.

**Reply:** variant and control, prompt set, rubric, trial pass rates, per-candidate notes, judge's verdict, your synthesis, and the promote-or-reject decision.
