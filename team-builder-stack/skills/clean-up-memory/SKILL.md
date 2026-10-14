---
name: clean-up-memory
description: "Use when a bot's memory may be stale, or the weekly review asks; lists stale facts and applies the yeses."
---

# Clean up memory

**Type:** workflow skill.

About ten profile facts per bot, the three setup facts in view, and every fact about the person kept unless they say otherwise. Weekly, inside the review. This skill has no routine of its own.

Each bot reviews itself. Only that bot sees its own profile facts in its prompt and can search the rest of its memory. Many facts are saved by the after-turn memory pass, with no visible tool call, so another bot cannot see them to judge them.

No bot reads or changes another bot's memory. No memory changes on a bot shared with a team. Health, money, family, and private life are left alone.

## Steps

1. **Load.** Read this skill at its path. Read the team spec, your operating guide, and the task list. This is your own memory only. If a routine of yours was told to run this skill, stop: the weekly review asks for it, and this skill has no routine of its own.
   Does: Read this skill, the spec, the operating guide, and the task list, and copy the steps into the run checklist.
   Pulls from: this bot's own memory, the team spec, and the task list
   Uses: none, this step only reads
   Produces: the run checklist, including any skipped step and its reason
   Hands to: Do the work, and it does not wait
   Needs your review: none, the review part is read only
   Copy this skill's steps into the run's checklist. A skipped step stays listed, with its reason.
2. **Do the work.** Run the part you were asked for: Review, Apply, or On request.
   Does: Run the Review, Apply, or On request part that was asked for.
   Pulls from: this bot's profile facts and the rest of its memory
   Uses: none, a bot reviews only its own memory
   Produces: the report or the counts
   Hands to: Verify, and it does not wait
   Needs your review: none, until the On request part asks before a change
3. **Verify.** Run [Verify work](../verify-work/SKILL.md) on the Review report, and wait for it. You do not grade your own check. The Apply counts are a labeled self-review, as the Apply part says, because only this bot can see its own memory.
   Does: Have a fresh checker grade the Review report, and label the Apply read-back a self-review.
   Pulls from: the Review report and the sources it cites, or the Apply read-back
   Uses: none, Verify work starts the checker, and only this bot can read its memory
   Produces: a pass or fail for the Review report, or the labeled Apply counts
   Hands to: Record, and it waits for the checker on the Review report
   Needs your review: none, the checker grades the report, and the person approved the Apply list before it ran
4. **Record.** Reply with the report or the counts. Do not write the review list yourself: Team Builder records decisions there. Do not copy a unit's facts into the report.
   Does: Reply with the report or the counts.
   Pulls from: the checker's result
   Uses: none, Team Builder records decisions in the review list
   Produces: the reply
   Hands to: Hand off, and it does not wait
   Needs your review: none, a change waits for a separate yes
5. **Hand off.** Review replies to Team Builder. Apply replies to Team Builder with the counts. On request, you ask the person in your own chat before anything that needs a yes.
   Does: Reply to Team Builder, or ask the person in this chat when they asked.
   Pulls from: the report or the counts
   Uses: none, the reply stays in this chat
   Produces: the reply to the asker
   Hands to: Team Builder for Review and Apply, or the person for On request, and it does not wait
   Needs your review: the On request part, before a change that needs a yes

## Review

When Team Builder asks, the bot reviews itself. Read only.

Read your profile facts in your prompt and search the rest of your memory. Check each fact against the team spec, your operating guide, and the task list. Reply to Team Builder with:

- outdated facts to remove, by exact text, with the source that settles it
- setup facts to refresh
- questions about the person's facts
- your profile count, and whether you see a "not shown" line

Label each item:

- **Memory: remove.** A duplicate or superseded fact, a fact a current source contradicts, or a fact about a retired bot. Name the source.
- **Memory: refresh.** A setup fact that is out of view.
- **Question.** A fact about the person that looks out of date. Do not remove it unless they say so.

Never reword a setup fact. Team Builder fixes a setup fact through Build a bot.

## Apply

When Team Builder messages the bot after the review, the bot applies the list. Find each approved fact by exact text, including any "[note] " prefix. Forget the removals. Refresh a setup fact by forgetting it and writing the same text again with UpdateMemory and `tier: "profile"`. Skip anything not found. Reply with the counts before and after, and whether all three setup facts are in view.

That read-back is a self-review, as [Verify work](../verify-work/SKILL.md#when-a-fresh-checker-isnt-needed)'s When a fresh checker isn't needed says: only this bot can see its own memory, so neither a fresh checker nor a script can read it. Open the reply with "Self-reviewed, not independently checked", never call it passed or checked, and name what it rests on: the person's yes on the exact text, in the weekly review or, on request, in this chat. The counts are this bot's own report. That yes covers only what they were shown, so list each skipped item by its exact text.

## On request

Any bot, on its own memory, in its own chat. Ask the person before anything that needs a yes. The same labels and the same rules apply.

## Team spec

<!-- team-builder-stack:begin spec role,team,workflows,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person's bots owns the work before you route or hand anything off.
- **Your workflows.** If missing: Check the person's skill library for what is already saved, and ask where each template lives today.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

Team Builder asks Account A for a Review.

> Profile count: 14. No "not shown" line. The three setup facts are in view.
>
> 1. **Memory: remove.** "Renewal is in March." The CRM says April. Exact text: Renewal is in March.
> 2. **Question.** "The person prefers a Monday brief." I have not seen that confirmed this month. Leaving it until they say.
