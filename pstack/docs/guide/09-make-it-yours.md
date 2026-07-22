# Create and test your own pstack skills

You create a personal mode from your work. You turn one repeated correction into a skill change. You test the change before you adopt it.

## 1. Create a personal mode

Run:

```text
/automate-me create a <handle>-mode skill from how I work in this project.
```

[`/automate-me`](../../skills/automate-me/SKILL.md) reads transcripts from the active workspace. It looks for repeated response, delegation, verification, code, prose, and process preferences. It then asks you which patterns matter.

The skill drafts `.cursor/skills/<handle>-mode/SKILL.md` through Cursor's built-in skill creator, `create-skill`. `/automate-me` applies the [`unslop` skill](../../skills/unslop/SKILL.md). It then shows you the draft. After you approve the draft, `/automate-me` opens a PR from a worktree.

When your preferences change, run `/automate-me` again:

```text
/automate-me update my <handle>-mode skill with the work since its last edit.
```

The update keeps rules that new evidence did not contradict. It adds a rule only when the pattern repeats.

## 2. Reflect on one completed session

Run:

```text
/reflect
```

[`/reflect`](../../skills/reflect/SKILL.md) sends the current transcript to three reviewers. A synthesizer groups the results as `Accepted`, `Rejected`, or `Backlog`.

Before you edit a skill, review the proposals. Approve only rules that will change a future decision. One unusual session is not enough evidence for a permanent rule.

## 3. Author one focused skill

If you already know the workflow to capture, run:

```text
/poteto-mode write a skill for verifying database migrations.
Use the Authoring or modifying a skill playbook.
```

The [Authoring or modifying a skill playbook](../../skills/poteto-mode/playbooks/authoring-a-skill.md) uses Cursor's built-in `create-skill` flow. It validates frontmatter, referenced files, and cross-skill links. It adds tests for structural rules. It skips tests for subjective rules. It then uses the Opening a PR playbook.

Use `create-skill` because that is the authoring flow named in the current pstack playbook. Do not write a `SKILL.md` from memory.

## 4. Test the skill change without revealing the comparison

Before you replace a skill rule, ask `/poteto-mode` to run the Eval playbook:

```text
/poteto-mode run the Eval playbook for this skill change.
Use the same natural task for the current and proposed forms.
Do not reveal the comparison to the workers.
```

The [Eval playbook](../../skills/poteto-mode/playbooks/eval.md) creates isolated directories with ordinary project names. Each worker receives the same user-style prompt without the hidden scoring criteria. One judge reviews all outputs under neutral labels.

Expect these artifacts:

- A short success rubric that workers never see.
- One isolated output per worker.
- Workspace-scoped transcripts that show which files each worker read.
- One judge verdict across all outputs.
- A recommendation to keep or reject the skill change.

Before you accept the judge's result, read every output. If your judgment differs, check for an unclear rubric or judge bias before you decide.

Next: [Use pstack recipes and avoid common mistakes](./10-recipes-and-pitfalls.md).
