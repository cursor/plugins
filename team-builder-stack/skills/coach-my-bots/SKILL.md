---
name: coach-my-bots
description: "Use when a bot got something wrong or the work changed; makes the smallest fix to the one skill, template, operating guide, or spec line that holds it."
---

# Coach my bots

**Type:** workflow skill.

Change the one place that holds what changed, then the skills that depend on it.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full.
2. Ask what changed, as a short multiple-choice question, unless the person already said: a bot got something wrong, add a skill, a system or tool changed, a rule every bot should follow, the voice changed, a unit started or ended, a new specialist or manager bot, put a workflow on a routine, or find work worth a skill.
3. Look before you change anything. Run Check my bots for only the bots and skills involved.
4. Make the change:
   - **A bot got something wrong.** Open the output and the source it should have matched, and find the step that went wrong. First try to sharpen the outcome or add a worked example that shows the right result. Add a rule only when that can't carry it. When a skill has more than a handful of rules, offer to prune the ones the outcome or an example now covers, one at a time, after a yes. If it trusted the wrong source, fix that system's line under Systems of record. A template fix goes where the template lives. If someone else owns the template or guideline, draft the change for the person to send its owner, and don't edit it. If several workflow skills need the same fix, put it in one standard skill they all name, as [Standard, utility, or workflow-specific](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says.
   - **Add a skill.** Look in the library first, and reuse or extend a skill that already does it. Otherwise run Write a workflow skill. A skill you add or rename is named and described as [Naming a skill](../write-a-workflow-skill/references/workflow-skill.md#naming-a-skill) says.
   - **A system or tool changed.** Look at it for real, with one read-only lookup. Update its line under Systems of record. Workflow skills read the spec each run, so most tool changes end there. Then find any workflow skill step that names the old system, and propose the smallest edit.
   - **The voice changed.** Run Set my writing voice.
   - **A rule every bot should follow.** Try it on one bot first: write it into the operating guide of that bot's type, or a skill it runs, and run it once on one bot. One guide edit reaches every bot of that type. A rule that must hold on every turn, even before the guide is read, also becomes a short profile fact, after a second yes: send it to each bot of that type, one plain line per bot. Keep each bot's profile facts to three or four. For a rule that must never be broken, tell the person to add it to their Auto Review rules too; you can't set those.
   - **A unit started, or a new specialist or manager bot.** Run Build a bot.
   - **Put a workflow on a routine.** Once it works by hand, recommend how it starts from what's actually available for the tool, and agree it with the person. Steps for a recurring job go in the skill. The routine only names that skill. An owner bot's workflow runs when the manager bot's morning kickoff messages it, or from a trigger; it gets its own routine only when there's no manager bot yet, or the person asks. A routine is created by the bot that runs it, in its own chat, paused, in the home time zone, with Test run, and the person turns it on. When the weekly bot review moves to a new day or time, move Weekly review prep with it, still starting 2 hours before, in the home time zone.
   - **A unit ended, or a bot or group chat is replaced.** Run Retire a bot.
   - **Find work worth a skill.** Ask what you may read: your past chats with them, chats they paste in, and what they wrote in connected systems. Split it into two or three slices by date, with a fresh subagent for each, looking for work that comes back on a rhythm and corrections they made. Keep a pattern seen in two or more slices. Confirm each finding, then add it to the backlog under Your workflows. Never copy facts about one unit.
5. Show each change and ask before you save it. Before you edit a skill or an operating guide, keep one dated backup if you want one, never a live copy in a working folder. One yes covers several changes only when you've summarized every one in one plain line each, and it covers exactly what's listed. A spec change is written first, then the skill or bot, then the team map is rebuilt. Save a changed skill yourself, through Grok Bot's own way of saving a skill; a helper only drafts. Never edit a library copy of a Team Builder skill. Then have Verify work read the saved version back against what was agreed before you say it's done.
6. Run each changed skill once, on a safe example, and review the result with the person. Offer Save what we learned if the session taught something a skill should hold.

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
