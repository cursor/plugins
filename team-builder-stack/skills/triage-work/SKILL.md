---
name: triage-work
description: "Called by a skill when work arrives as a stream of items; sorts each item to a skill, a bot, or the person."
---

# Triage work

**Type:** utility skill.

Work this bot owns goes to a fresh subagent on this bot, with only that item's material. Work another bot owns goes to that bot by direct message, never to a subagent here. [Delegate work](../delegate-work/SKILL.md) does both. The shape of the list is in [template.md](template.md).

## Steps

1. **Load.** Read the team spec for the person's bots and what each one owns. Open [template.md](template.md). Take the items, and look up each one's unit in the real system, by the unique ID the spec names for it. Don't place an item from its title alone.
2. **Do the work.** Say what each item is in one line, and give it exactly one place:
   - **A skill this bot runs.** The item belongs to a unit or topic this bot owns.
   - **The bot that owns it.** Another bot owns its unit or topic.
   - **The person.** It needs a decision or a relationship, or it sends, changes a record, or can't be undone. An item that only needs a fact is looked up first, not sent to the person.
   - **Nowhere yet.** It belongs to no unit anyone owns.

   When you can't tell, it goes to the person. Say what you'd need to know to place it next time. If the same kind of item keeps landing nowhere, say so in the list as a candidate for a new skill or bot, and create nothing.
3. **Verify.** Run [Verify work](../verify-work/SKILL.md) with the list and the spec's Your team section, and wait for its result. It reopens each item and checks that each has exactly one place, that nothing needing a decision went to a bot, and that no item stays on this bot when another bot owns its unit. Fix what it finds.
4. **Record.** Save the list and add a line to the log: how many items came in, and where each one went.
5. **Hand off.** Dispatch with Delegate work: a fresh subagent on this bot for each item a skill here runs, with only that item's material, and a direct message to the bot that owns each of the others. Send the person one list, from the template, with the items that are theirs.

## What good looks like

- Every item has exactly one place.
- Work this bot owns went to a fresh subagent with only its own material. Work another bot owns went to that bot.
- Nothing that needs a decision was sent to a bot.
- The person reads one list, not every item.

## Team spec

<!-- team-builder-stack:begin spec team,systems -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
<!-- team-builder-stack:end spec -->

## Example

A good triage list, with made-up names:

> **This morning's requests, 6 items.**
> - Account A seat count question. Sent to Account A.
> - Two renewal notes due this week. Each one started with the renewal note skill, in its own subagent.
> - Pricing exception for Account D. For you: pricing stays with a person.
> - Partner intro from a new company. For you: no bot owns this yet.
> - Duplicate of the Account A question. Merged with the first.
