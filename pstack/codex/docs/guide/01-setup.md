# Set up pstack

In this page you install the plugin, verify pstack's fixed model routing, install
its companion agents, and run your first task.

## Install the plugin

Add the marketplace that contains this package, then run:

```bash
codex plugin add pstack@<marketplace>
```

For a source checkout, the Codex plugin root is `pstack/codex/`. See the package
README for the personal-marketplace development flow. Start a new Codex thread
after installation so discovery sees the new skills.

## Install the routing policy and companion agents

Run:

```text
$pstack:setup-pstack
```

[`$pstack:setup-pstack`](../../skills/setup-pstack/SKILL.md) checks that the four exact
models are advertised by the current Codex surface. It then shows the proposed
global `AGENTS.md` block and the six package-owned custom-agent files. Nothing is
written until you authorize that exact change. Setup preserves unrelated global
instructions and agent profiles.

Use these model bindings unless your local config overrides them:

- `Spark` -> `gpt-5.3-codex-spark` for bounded micro-edits.
- `Luna` -> `gpt-5.6-luna` for high-volume search/extraction/verification/repetitive work.
- `Terra` -> `gpt-5.6-terra` for everyday feature, refactor, ordinary bug, and review tasks.
- `Sol` -> `gpt-5.6-sol` for architecture, complex bugs, performance, hill-climbing, synthesis, and judging.

Panel roles use Spark, Luna, Terra, and Sol; a separate Sol pass cross-judges
completed outputs.

`Daybreak` remains the parent/final review authority for security-sensitive decisions.

## Accept the verification offer, or don't

At the end of setup, `$pstack:setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`$pstack:create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.agents/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `$pstack:create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers when it earns its place.

After setup, start a new thread. The routing block and custom agents apply to new
sessions.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
$pstack:poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. The first item is always "read the Principles section". The rest are the matched playbook's steps copied in, the Feature playbook for this prompt. If `$pstack:poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. `$pstack:poteto-mode` is sticky. It stays on for the conversation until you opt out by saying so.

Next: [Route work through `$pstack:poteto-mode`](./02-poteto-mode.md).
