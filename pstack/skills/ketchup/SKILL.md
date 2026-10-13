---
name: ketchup
description: "Catch the user up on what changed in this chat since their last message, in a short reply built on real visuals. Give each action item just enough context to make the call. Use for /ketchup."
disable-model-invocation: true
---

# Ketchup

Catch the user up on what changed in this chat since the last message they wrote before `/ketchup`. Notifications and subagent results are not their messages. Write in the plain voice of [`/bro`](../bro/SKILL.md), and skip its restating step. Assume the user remembers their last message and nothing after it. Call each PR, branch, or agent by a name they would know, not by a label you invented during the work.

## Gather what changed

Keep this turn read-only, except for visuals you make for the reply from what you already have. Do not change code, start an app or a job, or post anything to make them. Collect your own work since that message, reports from subagents, and messages from anyone else in this chat. Check the current state of each PR, CI run, or agent this chat touched. Check each number you will show against the facts it comes from, and say so when you correct one.

An action item is a decision or step only the user can take, such as a product choice, an approval, an irreversible action, or access you lack. Include any still waiting on the user, even one raised before their last message. Work you can still do yourself is not an action item.

## Write the reply

Keep the text under 250 words. Markdown tables are text, so their words count. Visuals do not count. A visual replaces the text it shows, so never give a fact in both. Leave out work that changed nothing for the user.

Open with one sentence that says how many action items there are, or that there are none. If nothing happened and nothing waits on the user, say so and stop.

Then show what happened in one visual: each PR, run, or agent this chat touched, with its state (done, running, failed, or not checked). Under it, give at most three one-line results that change what the user knows or must do. Keep a result's key number in its line unless the visual shows it. Then name in one line any work left that you can do yourself.

Then give each action item in three lines: the decision, your recommendation and why, and what happens if the user does not answer. Write "unknown" for a part you do not know. Link to the detail.

Show each action item as a before and after, side by side, in a visual. For a choice, put the current state beside each option, or the options alone when there is no current state. Put the options and what each costs in the visual, not in the text. Skip the visual only for a request for access.

## Visuals

A visual is a picture: a screenshot, a video, a Mermaid diagram, a chart or diagram from `/visualize`, or a generated image. A Markdown table is not a visual, even with a before column and an after column.

Use screenshots or a video when the change is visible. If a visible change has none, add it to the visual of what happened, marked "No screenshot yet." For anything else, draw the visual from facts you have: a Mermaid diagram for states, flows, and structures, and a `/visualize` chart for numbers. Never invent a number, and never draw or generate a picture of a screen you did not capture. Link only artifacts that exist.
