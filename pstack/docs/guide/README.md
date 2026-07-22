# Use pstack effectively

Use one real task throughout this tutorial. You complete these steps:

1. Configure pstack.
2. Match the task to a playbook.
3. Verify the result.
4. If you leave before the work ends, record each decision for later review.

Start with `/poteto-mode`. If you need to control one part of the work, name the relevant skill.

## Follow the tutorial in order

For your first run, follow these pages in order:

1. [Set up pstack](./01-setup.md). Install the plugin. Configure model inheritance.
2. [Route work through `/poteto-mode`](./02-poteto-mode.md). Start a task. Follow the matched playbook.
3. [Understand the code](./03-understand.md). Before you edit, use `/how`, `/why`, `/teach`, or the Session pickup playbook.
4. [Design the change](./04-design.md). Compare designs. Review the chosen design.
5. [Build and clean the change](./05-build-and-clean.md). Use the build playbooks. When a bug has a small local test path, use `/tdd`. Clean the prose.
6. [Verify and ship](./06-verify-and-ship.md). Prove behavior on the real artifact. If the project has no scripted verification path, run [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md). If the verification skill's feature map drifts, run [`/maintain-verification-skill`](../../skills/maintain-verification-skill/SKILL.md). Open a focused PR.
7. [Run work while you are away](./07-overnight.md). Set a finish condition and keep a decision log. Use Cursor's built-in `/loop` command.
8. [Understand the principles](./08-principles.md). See when each of the 21 principles changes a playbook decision.
9. [Create and test your own pstack skills](./09-make-it-yours.md). Create a personal mode. Test skill changes.
10. [Use recipes and avoid common mistakes](./10-recipes-and-pitfalls.md). Copy useful prompts. Fix common mistakes.

## Start with one prompt

If you need one prompt now, use:

```text
/poteto-mode <your task>.
Use this finish condition: <observable result>.
Complete the task.
Show the evidence that proves the finish condition.
```

The first todo tells `/poteto-mode` to read the Principles section. The next todos copy the matched playbook steps. If `/poteto-mode` skips a step, the step stays as `skip: <reason>`.

Next: [Set up pstack](./01-setup.md).
