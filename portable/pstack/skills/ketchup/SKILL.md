---
name: ketchup
description: Catch the user up on what changed in this chat since their last message,
  in a few plain sentences and small visuals. Give each action item just enough context
  to make the call. Use for /ketchup.
disable-model-invocation: true
---

On Claude Code or Codex, first read [the runtime adaptation](../poteto-mode/references/runtime-adaptation.md). Apply its substitutions to this skill.

# Ketchup

Catch the user up on what changed in this chat since the last message they wrote before `/ketchup`, and help them understand each change, not only where it stands. Notifications and subagent results are not their messages. Assume the user remembers their last message and nothing after it.

Use [`/bro`](../bro/SKILL.md)'s voice, not its task: plain words, short sentences, no jargon, like one person catching up another. Say what changed for the user, not how you did it. Say "the tests pass", not "CI is green". Leave out hashes, file paths, commands, build numbers, and test counts unless the user needs one to act. Call each PR, branch, or agent by a name the user would know, not by a label you invented. If a fact needs context to make sense, give the context or leave the fact out.

## Gather what changed

Keep this turn read-only. Make visuals only from what you already have: do not change code, start an app or a job, or post anything. Collect your own work since that message, reports from subagents, and messages from anyone else in this chat. Check the current state of each PR, CI run, or agent this chat touched. Check each number you will show against the facts it comes from, and say so when you correct one.

An action item is a decision or step only the user can take, such as a product choice, an approval, an irreversible action, or access you lack. Include any still waiting on the user, even one raised before their last message. Work you can still do yourself is not an action item. Never make up a call to fill the reply. A step the user did not ask for and the work does not need is not an action item, unless it is irreversible and waiting on the user: give it one action line, no visual, and skip what happens if the user does not answer.

## Write the reply

Keep the whole reply well under 150 words, not counting visuals. When something is easier to grasp as a picture than as sentences, draw it: how a design or system works, a PR stack or dependency chain with each PR's state, a before and after of a fix, or options side by side. Never draw a status list or boxes with nothing connecting them. Never give a fact twice, in text or across visuals. Leave out work that changed nothing for the user. When words run short, cut from what happened before you cut from the action items.

Open with one sentence that says how many things need the user, or that nothing does. If nothing happened and nothing waits on the user, say so and stop.

Then show what happened, pictures first. Embed inline the screenshots and videos the work produced, then any diagram that explains a change. Then sum up in one short bullet per thing the user asked for: what came of it, and whether it is done, still running, failed, or not checked. Write each line the way you would say it out loud: "Search was slow from a missing index", not "Search review: done" or "Slow search: missing index". Name any bug found and fixed on the way. Each line must stay true when read alone. Never mark something done that still waits on the user, and leave out anything the action items say. Under the summary, give at most three short lines that change what the user knows or must do. Then name in one line any work left that you can do yourself.

Then list the action items as plain bullets, never as a diagram or box. Give each two lines, or one for an unasked irreversible step: the decision with your recommendation and why, then what happens if the user does not answer. Ask the call the user owns, such as merge, approve, or pick. A step you would take first goes in your recommendation. So does anything that must happen first, and anything that cannot be undone. Write "unknown" for a part you do not know. Link to the detail.

Show a choice after the list. If the screenshots above already show its options, write each option's gain and cost under its screenshot instead of drawing a new visual; otherwise, compare the options side by side, with the current state when there is one. Give every option the work weighed, each with what it gets the user and what it costs. Keep them out of the rest of the text.

## Visuals

A visual is a picture: a screenshot, a video, a Mermaid diagram, a chart or diagram from `/visualize`, or a generated image. A Markdown table is not a visual, even with before and after columns.

Keep each visual small enough to read at a glance: at most six boxes, with at most eight words in each. Write labels as plain words a person would say, not tags like "Tests: pass". A fact that needs a sentence belongs in the text, or nowhere.

Embed screenshots and videos inline when the change is visible, not only as links. If a visible change has none, mark its summary line "No screenshot yet," and say there what changed on screen. Draw diagrams and charts from facts you have: a Mermaid diagram for how things connect and a `/visualize` chart for numbers. Never invent a number, and never draw or generate a picture of a screen you did not capture. Link only artifacts that exist.
