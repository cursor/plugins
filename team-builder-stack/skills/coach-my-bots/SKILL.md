---
name: coach-my-bots
description: "Use when a bot got something wrong or the work changed; fixes the one skill, guide, or spec line that holds it."
---

# Coach my bots

**Type:** workflow skill.

Change the one place that holds what changed, then the skills that depend on it.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full.
   Does: Read the spec and the principles in full.
   Pulls from: the team spec and the principles file
   Uses: none, this step only reads files
   Produces: the spec and principles for this change
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only reads
2. Ask what changed, as a short multiple-choice question, unless the person already said: a bot got something wrong, add a skill, a system or tool changed, a rule every bot should follow, the voice changed, a unit started or ended, a new specialist or manager bot, put a workflow on a routine, or find work worth a skill.
   Does: Ask what changed, unless they already said.
   Pulls from: the person's answer
   Uses: none, this step only asks
   Produces: which kind of change this is
   Hands to: the next step, and it waits for the answer
   Needs your review: what changed
3. Look before you change anything. Run Check my bots for only the bots and skills involved.
   Does: Run Check my bots for only the bots and skills involved.
   Pulls from: those bots and skills
   Uses: none, Check my bots does the lookups
   Produces: what is already true
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only looks
4. Make the change. Write only a rule that holds for every bot running that item. A fact about one unit of work stays in that unit's record or that bot's memory, and a request that carries one is rewritten as a general rule or declined.
   Does: Make the one change in the place that holds it.
   Pulls from: the output, the source, and the team spec
   Uses: the connector for a system that changed, one read-only lookup
   Produces: the proposed change
   Hands to: the next step, and it waits before anything is saved
   Needs your review: the change, before it is saved
   - **A bot got something wrong.** Open the output and the source it should have matched, and find the step that went wrong. First try to sharpen the outcome or add a worked example that shows the right result. Add a rule only when that can't carry it. When a skill has more than a handful of rules, offer to prune the ones the outcome or an example now covers, one at a time, after a yes. If it trusted the wrong source, fix that system's line under Systems of record. A template fix goes where the template lives. If someone else owns the template or guideline, draft the change for the person to send its owner, and don't edit it. If several workflow skills need the same fix, put it in one standard skill they all name, as [Standard, utility, or workflow-specific](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says.
   - **Add a skill.** Look in the library first, and reuse or extend a skill that already does it. Otherwise run Write a workflow skill. A skill you add or rename is named and described as [Naming a skill](../write-a-workflow-skill/references/workflow-skill.md#naming-a-skill) says.
   - **A system or tool changed.** Look at it for real, with one read-only lookup. Update its line under Systems of record. Workflow skills read the spec each run, so most tool changes end there. Then find any workflow skill step that names the old system, and propose the smallest edit.
   - **The voice changed.** Run Set my writing voice.
   - **A rule every bot should follow.** Try it on one bot first: write it into the operating guide of that bot's type, or a skill it runs, and run it once on one bot. One guide edit reaches every bot of that type. A rule that must hold on every turn, even before the guide is read, also becomes a short profile fact, after a second yes: send it to each bot of that type, one plain line per bot. Keep each bot's profile facts to three or four. For a rule that must never be broken, tell the person to add it to their Auto Review rules too; you can't set those.
   - **A unit started, or a new specialist or manager bot.** Run Build a bot.
   - **Put a workflow on a routine.** Once it works by hand, recommend how it starts from what's actually available for the tool, and agree it with the person. Pick the widest schedule that still meets the deadline. Prefer an event trigger, or a check-back that deletes itself, to a schedule that keeps looking. Steps for a recurring job go in the skill. The routine only names that skill. Write the routine in the spec's Routines section first, with the trigger, its runs per week, and the full prompt text. Routines are saved only from that section. With a manager bot, an owner bot's workflow gets its ask from the manager bot's morning kickoff, as a dated file that names it as the reader, or from a trigger. It gets its own routine only when there's no manager bot yet, or the person asks. If the kickoff also names a message hand-off, check its first runs with Test where the routine shows Test; otherwise check the first scheduled run, and say which hand-off is tested. If the message doesn't arrive, the person confirms the ask in the manager bot's chat. Routines prepare, draft, and report first. Leave sending, buying, deleting, and publishing for the person's approval. The bot that runs it creates or changes the live routine from that text, in its own chat, paused, in the home time zone, with one Test run, since a test spends usage too. Where the routine doesn't show Test, check its first scheduled run instead. The person turns it on. Don't repeat the test for the same result. When the weekly bot review moves, move Weekly review prep with it. The schedule stays in that routine, in the home time zone from Your role. An existing workflow skill gets Load's cheap check only when the skill is rewritten, not when it is put on a routine.
   - **A unit ended, or a bot or group chat is replaced.** Run Retire a bot.
   - **Find work worth a skill.** Ask what you may read: your past chats with them, chats they paste in, and what they wrote in connected systems. Split it into two or three slices by date, with a fresh subagent for each, looking for work that comes back on a rhythm and corrections they made. Keep a pattern seen in two or more slices. Confirm each finding, then add it to the backlog under Your workflows. Never copy facts about one unit.
5. Fill every field you add or edit: the step fields Does, Pulls from, Uses, Produces, Hands to, and Needs your review, and the spec fields this change touches, including Waits, Connectors, How to read, and a routine's Skill and Runs per week. A field is never blank. Write none and the reason. Run the check in [build_team_map.py](../build-my-team/references/team-map/build_team_map.py) with `--check` on the draft before you save. If it lists a missing fact, ask the person. Do not guess. When the skill you change is used by more than one bot, run the old version and the new version on one example. A fresh checker grades both and is not told which is which. Show each change and ask before you save it. Before you edit a skill or an operating guide, keep one dated backup if you want one, never a live copy in a working folder. One yes covers several changes only when you've summarized every one in one plain line each, and it covers exactly what's listed. A spec change is written first, then the skill or bot, then the team map is rebuilt. Save a changed skill yourself, through Grok Bot's own way of saving a skill; a helper only drafts. Never edit a library copy of a Team Builder skill. An approved change to a skill this plugin ships is the suggestion in the Review part of Run the weekly bot review, and no other way. Then have Verify work read the saved version back against what was agreed before you say it's done.
   Does: Fill every field, run the check, and show each change.
   Pulls from: the draft and the check's list
   Uses: none, the check reads files
   Produces: the saved change, after a yes
   Hands to: the person, and it waits for the yes
   Needs your review: each change, before it is saved
6. Run each changed skill once, on a safe example, and review the result with the person. Offer Save what we learned if the session taught something a skill should hold.
   Does: Run each changed skill once on a safe example, and review the result.
   Pulls from: that example
   Uses: the connectors the changed skill names
   Produces: the example result
   Hands to: the person, and it waits for the review
   Needs your review: the example result

**Reply.** What changed, where, and what you left alone and why.

## Team spec

<!-- team-builder-stack:begin spec role,team,workflows,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Your workflows.** If missing: Check the person’s skill library for what is already saved, and ask where each template lives today.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

The person writes: "We moved our meeting notes to a new tool last week."

> I looked it up: your notes connector now reads the new tool, and I found last week's Account A notes there, by account name. One line in your team spec names the old tool, under Systems of record. Your workflow skills read the spec each run, so that's the only change most of them need.
>
> One skill, Account research, names the old tool in its Change log step. I'd change that step to "the meeting notes, from the notes tool named in the team spec".
>
> Apply both, or change one?
