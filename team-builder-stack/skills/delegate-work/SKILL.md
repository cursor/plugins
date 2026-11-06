---
name: delegate-work
description: "Called by a skill when work splits, runs long, or belongs to another bot; runs the pieces or sends them on."
---

# Delegate work

**Type:** utility skill.

Work goes one of two ways. Choose by who owns it.

- **To a fresh subagent on this bot.** For work this bot owns: the pieces of one job that run side by side, one for each unit, source, or point of view, an item triage placed with a skill this bot runs, or a long job, as step 2 says. A subagent starts fresh, gets only its own material, and ends with its result file.
- **To the bot that owns it, by direct message.** For work another bot owns, such as another unit or a topic a specialist bot owns. Never give it to a subagent here: another unit's work belongs with that unit's bot and its memory. Send only to the person's own bots. Work another person owns goes through a shared record or a shared channel, or through the person, because messaging another person's bot isn't something to plan on.

The shapes of a message to a subagent, a handoff message, and a combined result are in [template.md](template.md).

## Steps

1. **Load.** Read the team spec. Open [template.md](template.md). Find who owns the work under Your team. Gather links to each unit's record, found by its ID, rather than copies of it. Link each template where it lives, and never paste one into a message.
2. **Do the work.** For work this bot owns under a plan the person approved from Plan the work, in a skill marked plan-first or for work no skill covers, follow that plan. In any other skill, follow the calling skill's pattern and limits and run straight through, with no plan and no stop for one; work beyond them is named in the result as left out. An item Triage work placed goes to its subagent as Triage work says. The pattern or plan says which pieces run side by side, which wait on others, and how the results combine. Give every worker in a stage the same contract from the plan, or from the pattern when there is no plan. Start them a few at a time, as [Plan the work](../plan-the-work/SKILL.md) says, and start the next as each one returns. Name the pieces, each able to stand on its own, and write one message for each from the template with only its own material. Each message names the skill this work comes from by its name, and the bot's operating guide, and the step to run, never a copy of the steps. Workers don't share the bot's memory, so the names are how they find the rules. A job of more than a few steps or minutes runs as a worker, not inline in this bot's turn. A worker writes its result file in the run folder and ends once its done test passes, a source it needs is down or a fact isn't in its material, or the next step would send, change a record, or need a yes; it never waits to be resumed. A fix worker gets the first worker's brief, result file, and stop rule, plus the earlier result and the reason. Start the subagents side by side; if one is stuck or runs overlong, stop it and give the fix to a new worker. Read only their result files, never a transcript or chat, merge by the contract's fields, and name any piece that missed its done test. For work another bot owns, write the handoff message from the template: what's done, what's next, what they need with links, and when it's needed. When the handoff asks a question the rest of the work needs, finish this turn with the result minus that item, marked as waiting on that bot, and pick it up when the answer arrives as a later message. Don't wait or check for the reply.
3. **Verify.** Never check your own work; this holds for every bot. Run [Verify work](../verify-work/SKILL.md) and wait for its result. Run it from this bot's own turn once the subagents return, never from inside a subagent. Give it the stage's worker contract as the standard to check each result against. For subagent results, it reopens each linked source and checks each finding against it, and confirms each piece saw only its own material. For a handoff, it reopens the record and checks that the next bot can start without asking a question, that every link opens, and that nothing in the message belongs to another unit.
4. **Record.** Add a line to the unit's log: what was sent, to whom, and who holds the work now. If that log records only real changes to the unit (the team spec's [Records and logs](../build-my-team/references/team-spec-template.md#records-and-logs) says what counts), add one entry only when the handoff changed something by that rule; otherwise add nothing.
5. **Hand off.** Who replies depends on how the ask came in. If the person asked their manager bot and it delegated the work here, hand the result back to the manager bot, which reports back to the person; that hand-back is the manager bot's note, so don't also run Inform manager bot for that finish. A change the person makes in this bot's chat still runs it, and so does a check the manager bot asked this bot to run, whose note is the hand-back. If the person asked this bot directly, reply directly in that chat, and the calling skill's Hand off tells the manager bot with Inform manager bot. When the work waits on a person's reply or an outside event, set a check-back as [Waiting on something](../write-a-workflow-skill/references/workflow-skill.md#waiting-on-something) says; another bot's answer arrives as its own message and needs none. For subagent results, combine them from the template and hand them to the next step of the skill that called this one. Keep each finding's link, name any piece that failed without guessing its part, and where two pieces disagree, show both and the source that settles it. For another bot, message that bot directly. Don't hand off with a mention in a group chat; a message to another bot shows up in that bot's own chat. If a yes is needed, it happens in the chat of the bot doing the action. When the run's record is written, clear the run folder, as Plan the work says.

## What good looks like

- Work another bot owns went to that bot, never to a subagent here.
- Each subagent saw only its own material, and a failed piece is named, not filled in.
- The next bot can start without asking a question.
- The log shows who has the work now.

## Team spec

<!-- team-builder-stack:begin spec team,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

A combined result from three subagents, one for each source, with made-up names:

> **Account A, three sources checked side by side.**
> - CRM: renewal 1 April, contract value unchanged (linked).
> - Calls: the buyer asked about seat counts on 26 Sep (linked).
> - Email: no reply yet to the seat count follow-up of 27 Sep (linked).
>
> All three returned, and the check matched every finding to its source. No conflicts.

A handoff message to another bot:

> **To the product specialist.** Done: Account A wants 40 more seats from 1 April (call, 26 Sep, linked). Next: which plan fits 40 more seats, and is there a volume discount we can offer. Needed by Thursday, for the renewal note. The account page is linked.
