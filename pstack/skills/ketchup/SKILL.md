---
name: ketchup
description: "Catch the user up on what changed in this chat since their last message, in a few plain sentences and small visuals. Give each action item just enough context to make the call. Use for /ketchup."
disable-model-invocation: true
---

# Ketchup

Catch the user up on what changed in this chat since the last message they wrote before `/ketchup`. Notifications and subagent results are not their messages. Assume the user remembers their last message and nothing after it.

Talk like [`/bro`](../bro/SKILL.md): plain words, short sentences, no jargon, like one person catching up another. Say what changed for the user, not how you did it. Say "the tests pass", not "CI is green". Leave out hashes, file paths, commands, build numbers, and test counts unless the user needs one to act. Call each PR, branch, or agent by a name the user would know, not by a label you invented during the work. Write every line so someone who missed the work can follow it. If a fact needs context to make sense, give the context or leave the fact out.

## Gather what changed

Keep this turn read-only, except for visuals you make for the reply from what you already have. Do not change code, start an app or a job, or post anything to make them. Collect your own work since that message, reports from subagents, and messages from anyone else in this chat. Check the current state of each PR, CI run, or agent this chat touched. Check each number you will show against the facts it comes from, and say so when you correct one.

An action item is a decision or step only the user can take, such as a product choice, an approval, an irreversible action, or access you lack. Include any still waiting on the user, even one raised before their last message. Work you can still do yourself is not an action item. Never make up a call to fill the reply. A step the user did not ask for and the work does not need is not an action item, unless it is irreversible and waiting on the user: give it one action line, no visual.

## Write the reply

Keep the whole reply under 150 words, counting the words inside visuals and tables. Never give a fact in both the text and a visual. Leave out work that changed nothing for the user. When words run short, cut from what happened before you cut from the action items.

Open with one sentence that says how many things need the user, or that nothing does. If nothing happened and nothing waits on the user, say so and stop.

Then show what happened in one visual of at most four boxes. Give each thing the user asked for a box that says what came of it and whether it is done, still running, failed, or not checked. Write each box the way you would say it out loud: "Search was slow from a missing index", not "Search review: done" or "Slow search: missing index". Name any bug found and fixed on the way. Each box must stay true when read alone. Never mark something done that still waits on the user. Under the visual, give at most three short lines that change what the user knows or must do. Then name in one line any work left that you can do yourself.

Then give each action item in two lines: the decision with your recommendation and why, then what happens if the user does not answer. Ask the call the user owns, such as merge, approve, or pick. A step you would take first goes in your recommendation. So does anything that must happen first, and anything that cannot be undone. Write "unknown" for a part you do not know. Link to the detail.

Show each action item as a before and after, side by side, in a visual. For a choice, put the current state beside each option, or the options alone when there is no current state. Put every option the work weighed in the visual, each with what it gets the user and what it costs. Keep them out of the text. Skip the visual only for a request for access.

## Visuals

A visual is a picture: a screenshot, a video, a Mermaid diagram, a chart or diagram from `/visualize`, or a generated image. A Markdown table is not a visual, even with a before column and an after column.

Keep each visual small enough to read at a glance: at most six boxes, with at most eight words in each, not counting "No screenshot yet." Write labels as plain words a person would say, not tags like "Tests: pass". Group small items into one box. A fact that needs a sentence belongs in the text, or nowhere.

Use screenshots or a video when the change is visible. If a visible change has none, mark the box it belongs to "No screenshot yet," and say in a line under the visual what changed on screen. For anything else, draw the visual from facts you have: a Mermaid diagram for states, flows, and structures, and a `/visualize` chart for numbers. Never invent a number, and never draw or generate a picture of a screen you did not capture. Link only artifacts that exist.
