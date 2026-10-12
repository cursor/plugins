---
name: plan-the-work
description: "Called by Do the work when work splits or outgrows the skill's pattern; writes a plan sized to the work: stages, worker contracts, checks, and stop rules."
---

# Plan the work

**Type:** utility skill.

The skill sets the default way the work splits and its limits; this skill fits them to the run in front of the bot, as [Dynamic orchestration](../explain-how-it-works/references/principles.md#dynamic-orchestration) says. Plans scale with the work, and most runs need one line. The shapes of a plan and a worker contract are in [template.md](template.md).

The bot runs every stage itself: its subagents can't start subagents, it is woken as each one finishes, and each one's report lands in its own conversation. So keep plans small, start at most four subagents at once, and have each one write its result to a file with the same fields, so the bot reads one merged result instead of many reports.

## Steps

1. **Load.** Take the calling skill's default pattern and limits from its Do the work step, the unit's ID, its What good looks like, and the size of the work: how many units, sources, or items. Note whether the person is around: a chat, or a scheduled run with nobody watching. Open [template.md](template.md).
2. **Do the work.** Pick the size, then write the plan from the template.
   - **Small:** one unit, and the skill's pattern fits. A one-line plan that names the pieces. Hand it back.
   - **Large:** many units or items, work bigger than the pattern, or no skill fits. The full plan, with each stage in the bot's to-do list.
   - **Ask first:** more than four subagents at once, any change to code, or a run that costs a lot, such as many stages or rounds. Show the plan to the person and wait for a yes. In a scheduled run, never plan at this size: stay inside the skill's pattern and limits, and say in the run's report what was left out.

   A Large or Ask first plan names:
   - **Stages,** in order: what runs side by side and what waits on what.
   - **Subagents** for each stage: how many, each with only its own piece. At most four at once; start the next as one finishes.
   - **One worker contract per stage,** shared by every subagent in it: the skill to read, by its catalog path, with the step to run, never a copy of its steps; the brief, the same for all; the input, only that piece's ID and links; the output fields, a fixed list that always includes a source link and a not covered reason; where to write, one file per piece in the run folder; and the done test, taken from the skill's What good looks like.
   - **The run folder:** `/workspace/team-builder-stack/runs/<skill>/<unit ID>/<date and time>/`. It holds only IDs, links, and short findings, never copies of records.
   - **Checks:** Verify work after each stage that produces something saved or shown, one check per separate thing, given the stage's contract as the standard.
   - **Judge:** none, unless the result is a high-stakes judgment call and the person agrees to [Run review panel](../run-review-panel/SKILL.md).
   - **Stop rules:** a failed piece goes back to the subagent that wrote it, resumed with the reason, for one fix, with at most two rounds of fixes in all. Anything still failing is listed as not covered, never guessed. A source that's down means stop and ask, or, with nobody around, go on and say what was missing.
   - **Departures:** what differs from the skill's pattern, and why.

   Work another bot owns leaves the plan and goes to that bot with Delegate work's handoff. A manager bot sends each unit to its owner bot; it doesn't run subagents on units it doesn't own.
3. **Verify.** The plan gets no separate check; what it produces does, against its contracts. At the Ask first size, the person's yes is the check.
4. **Record.** Add a line to the unit's log only when the plan departed from the skill's pattern: what changed, and why. The plan itself lives in the bot's to-do list.
5. **Hand off.** Return the plan to the calling step. [Delegate work](../delegate-work/SKILL.md) runs the pieces by it. Once the calling skill's Record step has written the run's record and log line, delete the run folder. If the run stopped or is waiting, keep the folder until the run finishes, and delete it after seven days at the latest.

## What good looks like

- The plan is as small as the work allows.
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

Account A's owner bot, asked to find every objection in its last 20 call notes, with made-up names:

> **Plan: Large.** The skill reads 5 call notes by default; this run reads 20.
> 1. Read: one subagent per note, four at a time, in five waves. Contract: brief "list every objection in this note"; input, the note's ID and link; fields, objection, who raised it, date, source link, not covered reason; write to `runs/find-objections/account-a/2026-10-12-0900/note-07.md`; done when every objection is listed with its link, or the note is marked not covered with the reason.
> 2. Combine: merge the 20 files by objection, and remove duplicates.
> 3. Check: Verify work checks each objection against its note, with the contract as the standard.
>
> Stop: one fix per failed note, two rounds at most. Judge: none. Departure: 20 notes, not 5, because you asked for all of them.
