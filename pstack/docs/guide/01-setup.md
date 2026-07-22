# Set up pstack

In this tutorial, you install pstack. You configure its model roles. You then start a task with `/poteto-mode`. The `/setup-pstack` skill writes a rule for new sessions.

## Install the plugin

1. Open a Cursor chat.
2. Run:

   ```text
   /add-plugin pstack
   ```

3. Confirm that Cursor reports the plugin as installed.

## Configure model roles

1. Run [`/setup-pstack`](../../skills/setup-pstack/SKILL.md):

   ```text
   /setup-pstack
   ```

2. Review the available models and the role list.
3. For each role you want to override, choose a model.
4. Confirm the choices.

The skill writes `~/.cursor/rules/pstack-models.mdc`. A role that is absent from the rule uses the skill's default. If you want to restore a default, delete that role's line.

## Keep Auto-plan on the parent model

If you use Auto-plan, set a role to either `inherit-parent` or `auto`. Both values tell pstack to omit the subagent `model` field. The subagent then inherits the parent chat model.

These values are aliases. They are not model slugs.

For a panel role, each list entry starts one subagent. A list of inherited entries keeps the same panel size. Every subagent uses the parent model.

After setup, start a new Cursor chat. The model rule applies to new sessions.

## Start your first task

Run:

```text
/poteto-mode add a JSON output option to this command.
Keep the current text output unchanged.
Verify both output forms.
```

The first todo tells `/poteto-mode` to read the Principles section. The next todos come from the matched playbook. For this prompt, `/poteto-mode` should choose the Feature playbook.

You can now write normal follow-up prompts. `/poteto-mode` stays active until you opt out.

If you want to change one role or panel, read the full [`setup-pstack` skill](../../skills/setup-pstack/SKILL.md).

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
