---
name: inform-manager-bot
description: "Called by Hand off when a task is done, blocked, or changed in chat, or a manager's check ends; updates and notes it."
---

# Inform manager bot

**Type:** utility skill.

Keeps the manager bot current, so it has the latest when the person goes to it. Grok Bot has no task status shared across bots and sends nothing back when a bot finishes work, so this is how the manager bot hears. The task list is the record of what's done and of what the person changed; the note only points to it, and the task list wins when they disagree. The name says manager bot so it is never read as the person's own manager.

It runs from the Hand off step of every workflow skill when a task is finished, or the work is blocked, needs a decision, or a deadline is at risk. It also runs when the person says in chat that a task is done, parks or cancels it, moves its date, or changes what it is, and in a scheduled run that finds a task already finished. It runs as well when a check the manager bot asked this bot to run finishes, such as reading what a meeting decided once it ends. It isn't for the morning update: that run refreshes the unit's record, which replaces earlier notes, and the manager bot reads the record itself.

A note that does not need the manager bot to act now is sent. There's nothing to batch. The manager bot's operating guide says it doesn't reply to the person about these notes, and that its daily brief reads the task list and each unit's record, not the notes. Only the manager bot writes the daily brief; this bot never edits it. When a note says a change makes today's brief out of date, the manager bot corrects those lines in place, reading the task list, not the note, and sends the person nothing. The task list stays the record. The shape of a note is in [template.md](template.md).

## Steps

1. **Load.** Read the team spec: Your team for the manager bot, and Records and logs for the task list and for what counts as a change in the unit's log. Open [template.md](template.md). Find the task in the task list by its ID or link. For a check, take the one item the manager bot named in its ask, such as a meeting's calendar event id and link, and find each task the check touched. If the team has no manager bot, or this bot is the manager bot, update the task as step 2 says and stop: the result is already in the person's chat. A finished task is marked done. A task the person changed gets the new status or date and one line on why that quotes them. No note is sent.
2. **Do the work.**
   - **A finished task.** Mark it done in the task list with a one-line outcome, a link to the result, and how it closed: the person said so in chat, this bot finished it, or a scheduled run found it finished. No yes is needed. If the task list can't be written, don't call it done: say it couldn't be marked, and why.
   - **A task the person changed in chat.** Update the task first, with the new status or date and one line on why that quotes the person. That needs no yes. Parked, cancelled, moved, or rescoped are the changes this step writes. If the task list can't be written, say so, and why.
   - **A check the manager bot asked for.** Write each task the check marked done, filed, or moved in the task list first, with its link. Marking a task done needs no yes; anything else waits for a yes when this bot's operating guide says it does. Leave the daily brief to the manager bot. If the task list can't be written, say so, and why.
   - **The note.** Write one short note from the template: the unit, each task with its link, what's waiting and on whom, and what's needed from the manager bot: nothing, a decision, an unblock, or an update to a line on today's brief, and by when. A changed task uses the header `<Unit>: <n> task(s) parked.` or cancelled, moved, or rescoped, and a Changed line takes the place of Done. A check uses the header `<Unit>: <item> checked.`, then an Item line naming the one item the manager bot tracks it by, such as a meeting's calendar event id and link; an Outcome line giving the checked result in one sentence with its source link; and a Changed line listing each task done, filed, or moved, with its link, or nothing. Those three lines take the place of Done only: Waiting on stays, because a check can leave something waiting on the person, and Needed from you stays, naming an unblock as well as an update to a line on today's brief. Carry only this unit's facts, as links, never a copy of the record.
   - **When the manager bot should act now.** Nothing needed: send the note. Blocked, a decision needed, a deadline at risk, or a change that makes today's brief out of date: send it so the manager bot acts on it now. A check's note asks the manager bot to act now only when the result changes today's brief or leaves a block.
   - **One note per finished or changed task, and one per check.** Don't hold notes back to batch them.
   - **No note** when nothing changed in the unit by the team spec's Records and logs, or when the manager bot delegated this work: Delegate work's hand-back is the note. A change the person made in chat always gets a note, even on delegated work. A check the manager bot asked for always gets a note, even when nothing changed and even on delegated work.
3. **Verify.** When a calling skill's Verify step ran, the note carries no fact that check didn't pass. A change the person made in chat quotes their words and adds no other fact. A check's Outcome, and each change on its Changed line, are facts the check's own Verify step passed through Verify work; if no Verify step ran, run [Verify work](../verify-work/SKILL.md) on them and wait for its result before sending. Before sending, reopen the task list and read the task back: a finished task says done, with the outcome and the link, a task the person changed shows the new status or date and the line that quotes them, and each task on a check's Changed line shows that change. Every link in the note opens, and the note names only this unit.
4. **Record.** The task list entry is the record. Add a line to the unit's log only when Records and logs says a closed task counts, or a change the person made in chat counts. Don't copy the note anywhere else.
5. **Hand off.** Send the note to the manager bot by direct message, one message, never in a group chat, and never to a person or another person's bot. Run this from the bot's own turn, never from inside a subagent. Never edit the manager bot's brief: the note is how it hears. On a scheduled run, put a block, a decision, a deadline at risk, or a change to today's brief in the dated report, and send the note when the person replies to the summary in the chat. Never ask the manager bot for a yes: each yes happens in the chat of the bot doing the action.

## What good looks like

- Every finished task reads done in the task list, with its outcome, its link, and how it closed.
- A task the person changed in chat shows the new status or date, and one line on why that quotes them, and the manager bot got a note the same turn.
- The manager bot was told once per finished task, once per change the person made in chat, and once per check it asked for, and asked to act now only for a block, a decision, a deadline at risk, or a change to today's brief.
- A check's note names the one item it's about, so the manager bot changes only that item.
- The task list changed first, and the brief was left to the manager bot.
- The note points to the record and copies nothing from it.
- No note went out when nothing changed, or for work the manager bot delegated, unless the person changed it in chat or it was a check the manager bot asked for.

## Team spec

<!-- team-builder-stack:begin spec team,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

A note from Account A to the manager bot, with made-up names:

> **Account A: 1 task done.**
> - Done: renewal note drafted and checked (task linked).
> - Waiting on: your yes in Account A's chat to save it to the CRM.
> - Needed from you: nothing.

A note the manager bot should act on now:

> **Account B: blocked.**
> - Done: nothing new.
> - Waiting on: the CRM connector, down since this morning.
> - Needed from you: an unblock. Ask the person to reconnect the CRM before the renewal call.

A parked task the person changed in chat. The manager bot should act on it now, because today's brief still lists the task:

> **Account C: 1 task parked.**
> - Changed: parked, by the person in chat ("park the renewal note") (task linked).
> - Waiting on: nothing.
> - Needed from you: update the renewal line on today's brief.

A check the manager bot asked for, once Account D's weekly sync ended. The manager bot should act on it now, because the task it marked done is on today's brief:

> **Account D: weekly sync checked.**
> - Item: the Account D weekly sync (calendar event, ID linked).
> - Outcome: the buyer confirmed the security review is finished, so the renewal can go to signature (meeting notes linked).
> - Changed: security review task done (task linked).
> - Waiting on: the person's yes in Account D's chat to send the contract for signature.
> - Needed from you: update the security review line on today's brief.
