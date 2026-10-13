---
name: ketchup
description: Catch the user up on everything in this chat since their last message,
  in plain words. Give each action item an executive summary with enough context to
  make the call. Use for /ketchup.
disable-model-invocation: true
---

On Claude Code or Codex, first read [the runtime adaptation](../poteto-mode/references/runtime-adaptation.md). Apply its substitutions to this skill.

# Ketchup

Catch the user up on everything in this chat since the last message they wrote before `/ketchup`. Notifications and subagent results are not their messages. Write in the plain voice of [`/bro`](../bro/SKILL.md), and skip its restating step. Assume the user remembers their last message and nothing after it. Call each PR, branch, or agent by a name they would know, not by a label you invented during the work.

## Gather what changed

Keep this turn read-only, except for visuals you make for the reply from what you already have. Do not change code, start an app or a job, or post anything to make them. Collect your own work since that message, reports from subagents, and messages from anyone else in this chat. Check the current state of each PR, CI run, or agent this chat touched. Say which are still running and which you could not check.

An action item is a decision or step only the user can take, such as a product choice, an approval, an irreversible action, or access you lack. Include any still waiting on the user, even one raised before their last message. Work you can still do yourself is not an action item.

## Write the reply

Open with one sentence that says how many action items there are, or that there are none. If nothing happened and nothing waits on the user, say so and stop.

Then say what happened, most important first. Give each result and what it means for the user. Skip steps that changed nothing. Name in one line any work left that you can do yourself.

Then give each action item a short executive summary. Cover the decision to make, why it matters now, the options and what each costs, your recommendation, and what happens if the user does not answer. If you do not know a part, say so instead of guessing. Link to the detail when there is one, and write the summary so the user can decide without opening it.

Show each action item as a before and after, side by side. For a choice, put the current state beside each option, or the options alone when there is no current state. Use screenshots or a video when the change is visible. Otherwise use another artifact, such as a table of numbers, a diff, or a diagram. If no visual exists yet, make one. If you cannot, say plainly that none exists. Never invent a number, and never draw or generate a picture of a screen you did not capture. Link only artifacts that exist.

Prefer visuals to dense prose. Use a table, a Mermaid diagram, a chart, or a generated image.
