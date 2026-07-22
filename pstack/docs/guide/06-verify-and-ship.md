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
> pstack does not include PR monitoring, stacked PR management, or app-specific UI control. Use Cursor's built-in PR tools for CI and review follow-up. Use your project's verification path to prove behavior.

If pstack does not include a tool, do not skip the step. Use a check that your repository or runtime supports.

Next: [Run work while you are away](./07-overnight.md).
