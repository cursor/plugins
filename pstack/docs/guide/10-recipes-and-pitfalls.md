# Use pstack recipes and avoid common mistakes

When you need a known workflow, copy one recipe. Add concrete paths from your project. Add a finish condition and a verification command.

## Understand an unfamiliar subsystem

```text
/how trace the request from the public API to storage.
Name the owning modules and failure path.
/why explain why these boundaries exist.
Name the constraints that still apply.
```

Use `/how` for current mechanics. Use `/why` for the evidence behind the design.

## Learn enough to review a PR

```text
/teach me how this PR works.
Explain why this design was chosen.
Name the evidence that would disprove the main assumption.
```

When you want one combined explanation, use `/teach`.

## Design a costly change

```text
/architect with checkpoint.
Show the caller usage, types, signatures, and module map before implementation.
/interrogate the chosen design against the stated intent.
Do not edit files.
```

`/architect` already runs `/arena`. If you want a different panel size, configure `architect runners` through `/setup-pstack` before the task.

## Fix a bug with a small regression test

```text
/poteto-mode fix the duplicate write.
1. Reproduce the bug with one command.
2. If a small local test exists, use /tdd.
3. If you use /tdd, show the test failure.
4. Fix the cause.
5. Rerun the reproduction command.
```

If a test needs broad setup or costly fixtures, skip the new test. Use the closest executable check. State why you skipped the test.

## Run a large task while you are away

```text
/poteto-mode I am stepping away.
1. Use /figure-it-out to design the phases.
2. Use this finish condition:
   - The migration check reports zero old callers.
   - All fixtures pass.
3. Keep a decision log with /show-me-your-work.
4. Run Cursor's /loop until the finish condition passes.
```

Give `/loop` a finish condition. Do not use a duration as a substitute.

## Improve a skill after a session

```text
/reflect
```

Approve a durable correction. Route the edit through the Authoring or modifying a skill playbook. Run the Eval playbook when you need evidence that the new rule changes behavior.

## Avoid common mistakes

- Do not invoke every skill on every task. Use `/poteto-mode`, then add a skill when you need direct control.
- Do not give `/loop` a vague finish condition such as "make it better." Give it a command or artifact that can pass or fail.
- Do not let parallel agents write in one worktree. Give each independent attempt its own worktree.
- Do not accept every review comment. Use `/interrogate` to separate real defects from unsupported preferences.
- If no prior run covers the topic, use the Investigation playbook. Use `/how` for current behavior. Add `/why` when you need design reasons.
- Do not treat `auto` as a model slug. `auto` tells pstack to inherit the parent chat model.
- Do not invoke `typescript-best-practices` by hand. `typescript-best-practices` loads for `.ts` and `.tsx` files.
- Do not report success from a build alone. Verify the real command, flow, stored value, or profile.
- Do not write a `SKILL.md` without the Authoring or modifying a skill playbook and Cursor's `create-skill` flow.

Return to the [guide index](./README.md). To review tool boundaries, read [what pstack does not include](./06-verify-and-ship.md#replace-tools-that-pstack-does-not-include).
