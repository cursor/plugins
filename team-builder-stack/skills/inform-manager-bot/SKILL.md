---
name: inform-manager-bot
description: "Called by Hand off when a task finishes or is blocked; marks it done and sends the manager bot a linked note, waking it only for a block, decision, or deadline."
---

# Inform manager bot

**Type:** utility skill.

Keeps the manager bot current, so it has the latest when the person goes to it. Grok Bot has no task status shared across bots and sends nothing back when a bot finishes work, so this is how the manager bot hears. The task list is the record of what's done; the note only points to it, and the task list wins when they disagree. The name says manager bot so it is never read as the person's own manager.

It runs from the Hand off step of every workflow skill when a task is finished, or the work is blocked, needs a decision, or a deadline is at risk. It also runs when the person says in chat that a task is done, and in a scheduled run that finds a task already finished. It isn't for the morning update: that run refreshes the unit's record, which replaces earlier notes, and the manager bot reads the record itself.

A note sent without waking the manager bot is held and read at the start of its next turn, so notes sent one at a time arrive together; there's nothing to batch. The manager bot's operating guide says it doesn't reply to the person about these notes, and that its daily brief reads the task list and each unit's record, not the notes. The shape of a note is in [template.md](template.md).

## Steps

1. **Load.** Read the team spec: Your team for the manager bot, and Records and logs for the task list and for what counts as a change in the unit's log. Open [template.md](template.md). Find the task in the task list by its ID or link. If the team has no manager bot, or this bot is the manager bot, mark the task done as step 2 says and stop: the result is already in the person's chat.
2. **Do the work.**
   - **A finished task.** Mark it done in the task list with a one-line outcome, a link to the result, and how it closed: the person said so in chat, this bot finished it, or a scheduled run found it finished. No yes is needed. If the task list can't be written, don't call it done: say it couldn't be marked, and why.
   - **The note.** Write one short note from the template: the unit, each task done with its link, what's waiting and on whom, and what's needed from the manager bot: nothing, a decision, or an unblock, and by when. Carry only this unit's facts, as links, never a copy of the record.
   - **Waking.** Nothing needed: send it without waking the manager bot. Blocked, a decision needed, or a deadline at risk: send it so it wakes the manager bot now.
   - **One note per finished task.** Don't hold notes back to batch them.
   - **No note** when nothing changed in the unit by the team spec's Records and logs, or when the manager bot delegated this work: Delegate work's hand-back is the note.
3. **Verify.** The facts in the note were checked by the calling skill's Verify step, and the note carries no fact that check didn't pass. Before sending, reopen the task list and read the task back: it says done, with the outcome and the link. Every link in the note opens, and the note names only this unit.
4. **Record.** The task list entry is the record. Add a line to the unit's log only when Records and logs says a closed task counts. Don't copy the note anywhere else.
5. **Hand off.** Send the note to the manager bot by direct message, one message, never in a group chat, and never to a person or another person's bot. Run this from the bot's own turn, never from inside a subagent. In a scheduled run, never message another bot: put a block, a decision, or a deadline at risk in the message that wakes this bot's own chat, and send the note from that chat turn. Never ask the manager bot for a yes: each yes happens in the chat of the bot doing the action.

## What good looks like

- Every finished task reads done in the task list, with its outcome, its link, and how it closed.
- The manager bot was told once per finished task, and woken only when it or the person has to act.
- The note points to the record and copies nothing from it.
- No note went out for work the manager bot delegated, or when nothing changed.

## Team spec

<!-- team-builder-stack:begin spec team,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

A note from Account A to the manager bot, sent without waking it, with made-up names:

> **Account A: 1 task done.**
> - Done: renewal note drafted and checked (task linked).
> - Waiting on: your yes in Account A's chat to save it to the CRM.
> - Needed from you: nothing.

A note that wakes it:

> **Account B: blocked.**
> - Done: nothing new.
> - Waiting on: the CRM connector, down since 7 am.
> - Needed from you: an unblock. Ask the person to reconnect the CRM before the 2 pm renewal call.
