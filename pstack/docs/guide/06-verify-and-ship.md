# Verify the result and open a PR

Before `/poteto-mode` reports success, define the finish condition. Ask `/poteto-mode` to run the real command or flow. If the change writes data, inspect the stored value.

## Define the finish condition

Write the finish condition in the first prompt:

```text
/poteto-mode add JSON output to this command.
Use this finish condition:
- The text output remains byte-for-byte unchanged.
- The JSON output parses.
- Both forms run against the sample project.
```

`/poteto-mode` can now check each part of the finish condition.

## Prove behavior on the real artifact

The [Prove It Works principle](../../skills/principle-prove-it-works/SKILL.md) rejects proxy evidence when the real artifact is available.

Choose the check that matches the change:

- For a CLI change, run the real command.
- For a UI change, complete the changed flow in the running app.
- For a parser or migration, replay a saved input.
- For a performance change, compare the before and after profiles.
- For a storage change, read back the written value.

A build or type check still matters. It does not prove user behavior on its own.

Ask for the evidence in the reply:

```text
Show the exact command, output, and artifact path that prove the finish condition.
If a check is inconclusive, mark it as inconclusive.
```

## Create a project verification skill

If your project has no scripted way to prove app behavior, run:

```text
/create-verification-skill
```

[`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md) works with any language or platform. It inspects the repository first. It asks you only what the repository cannot answer. The inspection identifies:

- The user-facing app surface.
- The exact local launch and teardown commands.
- An existing way to drive the app, when the repository has one.
- A suitable fallback such as browser and CDP, CLI and PTY, or HTTP.
- The evidence that proves behavior.
- The isolation needed for parallel runs.

The skill writes `.cursor/skills/verify-<app>/`. Its `SKILL.md` contains exact Launch, Doctor, Drive, Evidence, and Cleanup instructions for future agents. The output is agent-facing. It is not a user README.

The generated skill also has a feature map. `features/README.md` indexes the user-facing features. Each feature file explains how to reach the feature and what result proves that the feature works.

Before `/create-verification-skill` returns the files, it proves the new skill once:

1. Launch the app.
2. Run the Doctor check.
3. Drive one mapped feature.
4. Capture the action and resulting state as evidence.
5. Clean up the process and scratch state.
6. Confirm that the evidence remains after cleanup.

Do not use the generated skill until this proof passes.

## Maintain a project verification skill

If the feature map no longer matches the app, run:

```text
/maintain-verification-skill
```

[`/maintain-verification-skill`](../../skills/maintain-verification-skill/SKILL.md) audits an existing project verification skill. It performs these steps:

1. Locate the verification skill and feature map.
2. Start one read-only subagent per feature in one parallel source wave.
3. Have each subagent trace its feature from source.
4. Have each subagent return citations, likely drift, and one live verification recipe.
5. Reconcile the source findings.
6. Run one live pass that covers every mapped feature.
7. Report one outcome.

The live pass follows the generated skill's Launch and Doctor instructions. The coordinator drives the app. Source subagents never drive the app or edit files.

The maintenance result is one of these outcomes:

- `clean`. Every feature has source and live coverage. No branch or PR is needed.
- `changed`. At most one PR contains proven corrections inside the verification skill directory.
- `blocked`. The report names the exact blocker. No PR is opened.

For a `changed` result, edits stay inside the verification skill's own directory. The PR can change its instructions, feature map, or owned helper scripts. The maintenance pass never changes product code. If the live pass finds a product defect, report the defect instead.

## Open the PR through the playbook

When verification passes, run:

```text
/poteto-mode open the PR with the Opening a PR playbook.
Keep the commits small and ordered.
Clean the diff before each commit.
Put the verification evidence in the PR.
```

The [Opening a PR playbook](../../skills/poteto-mode/playbooks/opening-a-pr.md) defines the worktree, commit, cleanup, and PR steps. Expect a focused diff, ordered commits, unslopped prose, and a PR link.

After the PR opens, use Cursor's built-in PR tools to watch CI. Use the same tools to process review comments. Before you change code, judge each comment against the task intent.

## Replace tools that pstack does not include

> [!NOTE]
> **What pstack does not include**
>
> pstack does not include PR monitoring or stacked PR management. Use Cursor's built-in PR tools for CI and review follow-up. pstack does not ship a ready-made controller for your app. Generate a project verification skill, or use the verification path your project already has.

If pstack does not include a tool, do not skip the step. Use a check that your repository or runtime supports.

Next: [Run work while you are away](./07-overnight.md).
