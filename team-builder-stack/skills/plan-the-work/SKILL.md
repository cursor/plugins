---
name: plan-the-work
description: "Called by Do the work in a plan-first skill, or when asked for a plan; shows stages, contracts, and stops for a yes."
---

# Plan the work

**Type:** utility skill.

The skill sets the default way the work splits and its limits; this skill fits them to the run in front of the bot, as [Dynamic orchestration](../explain-how-it-works/references/principles.md#dynamic-orchestration) says. Plans scale with the work, and most runs need one line. Every plan, whatever its size, is shown to the person as a plan page. They can change it as often as they like, and the work starts only after they approve it. The shapes of a plan and a worker contract are in [template.md](template.md).

A skill its author marked plan-first, as Do the work in [How to fill each step](../write-a-workflow-skill/references/workflow-skill.md#how-to-fill-each-step) says, runs this skill before it builds anything, whatever the size, in a chat or on a schedule. A skill not marked plan-first never calls it: it runs straight through inside its own pattern and limits, and says in its result what was left out. The marking is the author's choice; the bot never marks a run plan-first on its own. Work no skill covers, such as a one-off request in a chat, gets a plan from this skill only when the person asks for one, and that plan waits for the same yes.

Keep plans small, and keep delegated work to a few helpers at a time; a plan that needs more says why on its plan page. Have each helper write its result to a file with the same fields, so the bot reads one merged result instead of many reports.

## Steps

1. **Load.** Take the calling skill's default pattern and limits from its Do the work step, the unit's ID, its What good looks like, and the size of the work: how many units, sources, or items. Write a plan for a calling skill with a `Plan-first: yes` line, or when the person asks for a plan for work no skill covers. When a skill without that line calls this skill, such as one whose Do the work calls it when its work splits, write no plan: hand back to it to run straight through inside its pattern and limits, and to say what was left out. Otherwise open the calling skill's template, when there is one, and [template.md](template.md).
2. **Do the work.** Pick the size, write the plan from the template, and show it to the person in the chat as a plan page. In a scheduled run, deliver the plan page to the person where the routine's Delivers to line says, or in the bot's chat with them when that line names only bots; the routine's trigger sets when, such as a review time the person set.
   - **Small:** one unit, and the skill's pattern fits. A one-line plan that names the pieces, plus the plan page lines below for a skill.
   - **Large:** many units or items, work bigger than the pattern, no skill fits, more helpers at once than the paragraph above allows, or any change to code. The full plan, with each stage in the bot's to-do list.

   For a skill, the plan page also holds the deliverable's structure, the content for each section, the sources, and the open questions, from the skill's template. When the person changes the plan, update the page and show it again. Nothing is built, and no subagent starts, until the person approves it, on a scheduled run too: the run ends with the plan page, and the work waits for the person's yes in the chat.

   A Large plan names:
   - **Goal and done:** what finished looks like, from the skill's What good looks like.
   - **Stages,** in order: what runs side by side and what waits on what.
   - **Subagents** for each stage: how many, each with only its own piece; start the next as one finishes.
   - **One worker contract per stage,** shared by every subagent in it: the skill to read, by its name, with the step to run, never a copy of its steps; the brief, the same for all; the input, only that piece's ID and links; the output fields, a fixed list that always includes a source link and a not covered reason; the result file, one per piece in the run folder; and the done test, taken from the skill's What good looks like. Workers run and stop as [Delegate work](../delegate-work/SKILL.md) says.
   - **Code:** none, or what changes and why.
   - **The run folder:** `/workspace/team-builder-stack/runs/<skill, or plan-the-work>/<unit ID>/<date and time>/`. It holds only IDs, links, and short findings, never copies of records.
   - **Checks:** Verify work after each stage that produces something saved or shown, one check per separate thing, given the stage's contract as the standard.
   - **Judge:** none, unless the result is a high-stakes judgment call and the person agrees to [Run review panel](../run-review-panel/SKILL.md).
   - **Stop rules:** a failed piece gets one fix, by a new worker as Delegate work says, with at most two rounds of fixes in all. Anything still failing is listed as not covered, never guessed. A source that's down means stop and ask, or, with nobody around, go on and say what was missing.
   - **Departures:** what differs from the skill's pattern, and why.

   Work another bot owns leaves the plan and goes to that bot with Delegate work's handoff. A manager bot sends each unit to its owner bot; it doesn't run subagents on units it doesn't own.
3. **Verify.** What the plan produces is checked against its contracts. A plan made only of facts the person set or gave in this chat is shown on its plan page labeled "Self-reviewed, not independently checked", and the person's yes is the check. A plan that states facts from sources gets Verify work's full check before it is shown, as its When a fresh checker isn't needed section says. Any of the four kinds in [Verify work](../verify-work/SKILL.md#numbers-and-claims)'s Numbers and claims in a plan always gets a fresh checker: a figure, a claim that something was filed, sent, or done, a claim that something doesn't exist, or a data pull the person asked for. The person's yes on a plan never replaces Verify work on what the plan produces.
4. **Record.** Add a line to the unit's log only when the plan departed from the skill's pattern: what changed, and why. The approved plan page is the plan, and its stages go in the bot's to-do list.
5. **Hand off.** Once the person approves the plan, return it to the calling step, or, for work no skill covers, run it with [Delegate work](../delegate-work/SKILL.md). Delegate work runs the pieces by it. Once the calling skill's Record step has written the run's record and log line, or, for work no skill covers, once Delegate work returns its checked result, delete the run folder. If the run stopped or is waiting, keep the folder until the run finishes, and delete it after seven days at the latest.

## What good looks like

- The plan is as small as the work allows.
- The person approved the plan page before any work started.
- Every subagent in a stage got the same contract and only its own piece.
- The results combined by the contract's fields, with no cleanup.
- A departure from the skill's pattern is named, with its reason.
- The run folder is gone once the record is written.

## Team spec

<!-- team-builder-stack:begin spec team,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

Account A's owner bot runs its Find objections skill, which its author marked plan-first, and the person asks for every objection in the last 20 call notes, with made-up names:

> **Plan: Large.** The skill reads 5 call notes by default; this run reads 20.
> - Structure: one section per objection, then a short list of who raised each.
> - Content: for each objection, the words used, who raised it, the date, and how often it came up.
> - Sources: the 20 call notes, each linked.
> - Open questions: none.
> - Goal and done: every objection in the 20 notes, each linked to its note. Code: none. Run folder: `/workspace/team-builder-stack/runs/find-objections/account-a/2026-10-12-0900/`.
>
> 1. Read: one subagent per note, four at a time, in five waves. Contract: brief "list every objection in this note"; input, the note's ID and link; fields, objection, who raised it, date, source link, not covered reason; result file `/workspace/team-builder-stack/runs/find-objections/account-a/2026-10-12-0900/note-07.md`; done when every objection is listed with its link, or the note is marked not covered with the reason.
> 2. Combine: merge the 20 files by objection, and remove duplicates.
> 3. Check: Verify work checks each objection against its note, with the contract as the standard.
>
> Stop: one fix per failed note, by a new worker, two rounds at most. Judge: none. Departure: 20 notes, not 5, because you asked for all of them.
>
> Change any line, or say yes, and the reads start after your yes.
