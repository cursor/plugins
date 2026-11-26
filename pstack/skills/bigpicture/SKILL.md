---
name: bigpicture
description: Step back and critically check current work against the overall intent. Use for /bigpicture, "big picture", or when a plan has grown past the problem that started it and the question is whether the work still makes sense, is needed, or is over-engineered. Run it at any time; it helps most deep in a job.
disable-model-invocation: true
---

# Big Picture

Run this at any time. It helps most when you are deep in a job and about to add machinery, ask for an approval, or push through a blocker. Also run it when the human asks what this is even about.

1. **Find the big picture.** Do not assume it. Look for the documented intent of the codebase: README, docs, plans, design notes, and the descriptions of the issues and PRs behind the work. Read [`/why`](../why/SKILL.md) for the record behind a decision and [`/recall`](../recall/SKILL.md) to recover earlier conversations. Read the relevant transcript with the operator, and use [`/in-your-own-words`](../in-your-own-words/SKILL.md) to restate what they want. Then state the big picture in two sentences at most: the objective and the outcome the operator wants, in their words. A narrow technical decision is never the big picture. "Use a queue" is a decision. "Reports reach customers the same day" is the outcome. If the sources conflict, say so. A later operator instruction supersedes an older document or message only when it clearly does. A failed assumption, a need that no longer exists, or an outcome already met elsewhere is a reason to question the recorded goal, not proof that it is wrong. If the evidence does not settle what the operator wants, do not pick or invent a goal: show the conflict and its evidence, and propose an amended objective for the operator to confirm.
2. **State the immediate issue.** The specific blocker or decision in front of you, in one paragraph.
3. **Test the premise.** Write down the one premise the current approach assumes. Check it against the purpose: does the original goal still need this step, or is the goal already met without it? Two or more fixes that share one premise failing the same gate means attack the premise, not the next fix (`../principle-attack-the-premise/SKILL.md`).
4. **Is this needed?** Sort every active piece of work into three piles: required by the original request, useful but optional, and added by the approach itself. Say which pile each piece is in.
5. **Is this over-engineered?** Count what stands between here and done: artifacts, reviews, agents, guards, wrappers. If deleting a step makes its own problems vanish with it, delete the step (`../principle-subtract-before-you-add/SKILL.md`, `../principle-laziness-protocol/SKILL.md`). Prefer the smallest change that meets the goal.
6. **Verdict.** In plain words: continue, simplify (name what to delete), or stop (name what is already achieved). Give the smallest sound path forward and the one decision, if any, that genuinely belongs to the human. If the goal itself looks wrong or out of date, that decision is the amended objective: state it with the evidence, and do not change direction until the operator agrees.

Rules:

- Frame everything in objectives and outcomes, not narrow technical choices.
- Never replace the operator's goal on your own. Propose a change and let them decide.
- Evidence over theorizing. Label facts, reports and opinions separately.
- "No, this is not needed" is a good answer.
- Never add machinery to pass this check.
- If the verdict stops work, say what to delete or stand down, not only what to keep.
- A simpler alternative is not verified by being simpler. Hold it to the same evidence standard as the plan it replaces; an unproven shortcut is its own risk, and a step that depends on something never identified or never tested is not a small step.
