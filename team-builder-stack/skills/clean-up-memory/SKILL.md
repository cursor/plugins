---
name: clean-up-memory
description: "Use when a bot's memory may be stale or crowded, or the weekly review asks for a report; lists outdated, duplicate, and contradicted facts, applies only what was approved, and reports the counts."
---

# Clean up memory

**Type:** workflow skill.

About ten profile facts per bot, the three setup facts in view, and every fact about the person kept unless they say otherwise. Weekly, inside the review. This skill has no routine of its own.

Each bot reviews itself. Only that bot sees its own profile facts in its prompt and can search the rest of its memory. Many facts are saved by the after-turn memory pass, with no visible tool call, so another bot cannot see them to judge them.

No bot reads or changes another bot's memory. No memory changes on a bot shared with a team. Health, money, family, and private life are left alone.

## Steps

1. **Load.** Read this skill at its path. Read the team spec, your operating guide, and the task list. This is your own memory only. If a routine of yours was told to run this skill, stop: the weekly review asks for it, and this skill has no routine of its own.
2. **Do the work.** Run the part you were asked for: Review, Apply, or On request.
3. **Verify.** Run [Verify work](../verify-work/SKILL.md) on the report or the counts, and wait for it. You do not grade your own check.
4. **Record.** Reply with the report or the counts. Do not write the review list yourself: Team Builder records decisions there. Do not copy a unit's facts into the report.
5. **Hand off.** Review replies to Team Builder. Apply replies to Team Builder with the counts. On request, you ask the person in your own chat before anything that needs a yes.

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
