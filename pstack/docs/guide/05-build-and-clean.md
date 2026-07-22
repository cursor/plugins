# Build the change and clean the diff

Tell `/poteto-mode` the task type. State the finish condition. Name the evidence you expect. `/poteto-mode` chooses the matched playbook and cleans the diff before each commit.

## Choose the build playbook

Use these prompts as starting points:

| Playbook | Prompt | Result to expect |
|---|---|---|
| [Bug fix](../../skills/poteto-mode/playbooks/bug-fix.md) | `/poteto-mode this command emits two records after a retry. Reproduce the failure. Find the cause. Fix the cause. Rerun the same command.` | A failing reproduction, a confirmed cause, the smallest supported fix, and a passing reproduction. |
| [Feature](../../skills/poteto-mode/playbooks/feature.md) | `/poteto-mode add a --json option. Keep text output unchanged. Define the data shape before implementation. Verify both output forms.` | A grounded design, a named data shape, an implementation diff, and real output from both forms. |
| [Refactoring](../../skills/poteto-mode/playbooks/refactoring.md) | `/poteto-mode move parsing into one module without changing behavior. Record the current output first. After each step, prove that the output is unchanged.` | A behavior pin, small structural commits, and old-versus-new output proof. |
| [Perf issue](../../skills/poteto-mode/playbooks/perf-issue.md) | `/poteto-mode startup takes 1.8 seconds on this fixture. Capture a baseline profile. Fix the measured cause. Report the before and after values.` | A baseline artifact, a trace-backed change, a post-change artifact, and a measured difference. |

When you want repeated attempts against one metric, use the [Hillclimb playbook](../../skills/poteto-mode/playbooks/hillclimb.md). Set a target and a minimum attempt count. Give Hillclimb a fixed measurement command. Name the regression check.

## When the test path is cheap, use TDD

Run:

```text
/tdd add a regression test for the duplicate record.
Run the test before the fix.
Show the expected failure.
Fix the bug.
Rerun the test.
```

[`/tdd`](../../skills/tdd/SKILL.md) writes the smallest useful failing test before the production fix. It reruns the same test after the fix. When the change has wider risk, `/tdd` runs nearby checks.

If a test needs broad setup or brittle mocks, use the closest executable check. State why you skipped the test. A focused script or real command can provide stronger evidence than a test that copies implementation details.

## Let TypeScript rules load on their own

[`typescript-best-practices`](../../skills/typescript-best-practices/SKILL.md) loads when the agent reads or edits a `.ts` or `.tsx` file. You do not need a slash command.

The skill turns the type system and boundary principles into concrete TypeScript rules. It favors discriminated unions, boundary validation, `unknown` for external data, exhaustive variants, and schema-derived types.

## Clean the diff before each commit

The [Opening a PR playbook](../../skills/poteto-mode/playbooks/opening-a-pr.md) calls `/deslop` before each commit. pstack does not bundle `/deslop`.

1. If your environment exposes `/deslop`, run it on the diff.
2. If `/deslop` is unavailable, ask `/poteto-mode` to remove needless comments, unsupported guards, dead compatibility paths, and unrelated edits.
3. Apply [`/unslop`](../../skills/unslop/SKILL.md) to documentation, commit text, and the PR description.
4. Inspect the diff.
5. Run the repository checks.

Use a direct prompt when a prose file still needs work:

```text
/unslop pstack/docs/guide/05-build-and-clean.md.
Cut filler.
Remove repeated claims.
Keep the commands and evidence.
```

`/poteto-mode` applies `/unslop` to its replies. To rewrite a prose file, invoke `/unslop` with the file path.

Next: [Verify and ship](./06-verify-and-ship.md).
