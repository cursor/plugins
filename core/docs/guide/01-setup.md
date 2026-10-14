# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

Install pstack for your host:

```text
./install.sh
```

The installer detects your host, copies the right build, and never overwrites your existing instructions file.

## Pick your models

Run:

```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) detects your agent host, probes what it can actually do, then finds the models you have access to, asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes `.pstack/host.json` and `.pstack/models.md`, which every pstack skill reads.

The default budget is `large`, requesting `xhigh` reasoning where the host supports it. Choose `large` for high reasoning effort, `unlimited` for the highest reasoning effort the selected model and host support, or `medium` and `small` to spend fewer tokens. Setup records the supported settings; it must not invent a reasoning level the host cannot select.

You only override what you care about. A role with no line in the rule keeps the skill's default. To restore a default, delete that role's line. A rerun of `/setup-pstack` keeps any role whose model differs from the default. When a default changes, a rule written before the change still pins the old default, so delete those role lines, or delete the file, then run `/setup-pstack` again.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm-workers`, the default model for every `/swarm` worker unless a race names a model for each arm.

## Accept the verification offer, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `control-*` or older `verify-*` skill, or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `{{SKILL_DIR}}/control-ui/` or `{{SKILL_DIR}}/control-cli/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you are new to pstack, accept the offer. A verification skill lets the agent check its work before returning it for review.

After setup, start a new chat. The model rule applies to new sessions.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. Mode persistence depends on the host: this port records the state in `.pstack/mode.md` and uses the host binding to restore it on later turns. Cursor also supports a [Custom Mode](https://cursor.com/docs/skills), selected with Option+Enter (Mac) or Alt+Enter (Windows), which keeps the skill in context. A one-message skill attachment alone does not guarantee persistence.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
