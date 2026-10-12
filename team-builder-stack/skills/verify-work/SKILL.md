---
name: verify-work
description: "Called by every Verify step before anything is saved or shown; a fresh checker reopens each source and checks each claim against the standard."
---

# Verify work

**Type:** utility skill.

A bot never checks its own work, as [Independent verification](../explain-how-it-works/references/principles.md#independent-verification) says. The skill that calls this one says what to check; this skill says how, so the rules live in one place.

## Steps

1. **Take what to check** from the calling skill: the draft, the unit's ID, the calling skill, the sources that settle each fact, and the standard from its What good looks like and its template. Pass every point of What good looks like to the checker, word for word. The team spec's Systems of record says which system settles each fact. When several separate things need checking, run one check for each.
2. **Start a fresh checker.** A new conversation with no part in the draft, told exactly what to check and against which sources, and wait for it. It reopens each source itself and checks each claim and the standard. It grades the draft against every point of the calling skill's What good looks like, one line each: pass or fail, with a one-line reason. It confirms every fact belongs to the unit being worked on, found by its ID, such as the right account, and fails any fact mixed in from another unit. It fails any open question or gap the sources could have answered. It fails any question put to the person that the sources could answer, and any offer to go ahead on an unchecked fact. When a guideline applies, it reads it fresh, and the result notes which version or date it checked against. If the tool for starting one isn't in your list, look it up among the tools you can find before you count it as failed. Start the checker from the bot's own turn. If the work ran in a subagent, the subagent returns its results and stops, and the bot that started it starts the checker. A subagent never tries to start the check itself.
3. **If that fails, send the check to the bot under Who verifies** in the team spec, a specialist or manager bot. Its answer arrives later as its own message: write nothing until then, and finish the check when it arrives. If Who verifies says none, tell the manager bot (or the person, if there's no manager bot) that the check couldn't run, and write nothing.
4. **If a source the check needs is down,** stop and ask the person to help get it back up before going on. In a scheduled run with nobody around, go on with what you have, mark each claim that source settles as unchecked, and say what was missing in the result.
5. **Never mark it passed when the same bot ran the check.** An in-line read of your own draft isn't a check.
6. **If neither works, write nothing,** and report the exact error text to the person.
7. **Return the result** to the calling skill: each claim passed or failed with its source, and each point of What good looks like passed or failed with its reason. Nothing is saved or shown until every line passes or the person decides.

## What good looks like

- The checker had no part in the draft, and reopened every source itself.
- Every claim and the standard were checked, one line each, with the source.
- Every fact belongs to this unit; one from another unit fails the check.
- A failed start is reported with its exact error, never passed over.
- Every point of the calling skill's What good looks like got its own pass or fail, with a reason.

## Team spec

<!-- team-builder-stack:begin spec team,systems -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
<!-- team-builder-stack:end spec -->

## Example

A result returned to the renewal note skill, with made-up names:

> **Check of Account A's renewal note, by a fresh checker.**
> - Renewal date 1 April: matches the CRM (linked).
> - 40 more seats asked for on 26 Sep: matches the call (linked).
> - Leads with the one decision you need to make: matches the template.
> - What good looks like: 'Every renewal date is linked to the CRM': pass, both dates linked. 'Under 200 words': fail, 240 words.
>
> 3 of 3 lines passed. Nothing else to fix.
