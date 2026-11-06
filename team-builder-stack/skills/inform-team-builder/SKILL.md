---
name: inform-team-builder
description: "Called by a bot when a skill, guide, routine, or rule should change; sends Team Builder the evidence."
---

# Inform Team Builder

**Type:** utility skill.

A bot calls this when how it works should change: a skill, an operating guide, a routine, or a standing rule about how it does the job. Examples: the person corrected it in a way a skill should hold, a step turned out wrong or missing, or a routine needs changing. A fact about its unit of work, or a preference it learns while doing the work, stays in its own memory and does not come here. This skill sends the message. It does not apply the change. Team Builder makes the change only after the person says yes. The bot saves that change only when Team Builder sends it after the yes.

The message carries only a rule that holds for every bot running that item. A fact about one unit stays in that unit's record. Rewrite a proposal that carries one as a general rule, or decline it and say where the fact stays.

Team Builder acts on the message now only when a run failed or something was written wrong. Otherwise the message is held, and Team Builder adds it to the weekly decision list. With no Team Builder, the message goes to the person. The shape of the message is in [template.md](template.md).

## Steps

1. **Load.** Read the team spec: Your team, for the bot named Team Builder. Open [template.md](template.md). Read the item that should change, and copy its current text from where it lives now.
2. **Do the work.**
   - **The message.** One direct message from the template. Name the item, where it lives, the current text, the proposed text, and the evidence as links. Carry no fact about one unit. If the proposal is only one unit's fact, do not send it: say that the fact stays in that unit's record.
   - **When Team Builder should act now.** A run failed, or something was written wrong: send it so Team Builder acts on it now. Anything else: send it so it is held for the weekly decision list.
   - **No Team Builder.** Send the same message to the person in this chat, and stop.
3. **Verify.** The proposed text is a rule for every bot running that item. The current text matches the item. Every evidence link opens. The message names no unit's facts. The calling skill's Verify step already passed any fact this message relies on.
4. **Record.** The message is the record. Do not copy it into memory, the team spec, or a unit's record.
5. **Hand off.** Send the message to Team Builder by direct message, one message, never in a group chat, and never to another person's bot. Run this from the bot's own turn, never from inside a subagent. On a scheduled run, put a failed run or a wrong write in the dated report, and send this message when the person replies to the summary in the chat. A change that does not need Team Builder to act now is held for the weekly decision list. With no Team Builder, the scheduled run puts the message in that dated report, and the person reads it with the summary. Never ask Team Builder for a yes: the yes happens in Team Builder's chat with the person.

## What good looks like

- Team Builder got one message, or the person did when there is no Team Builder.
- The message names the item, the current text, the proposed text, and the evidence as links.
- It carries a rule for every bot running that item, and no fact about one unit.
- Team Builder was asked to act now only when a run failed or something was written wrong.
- Nothing was changed here. Team Builder changes it only after the person says yes.

## Team spec

<!-- team-builder-stack:begin spec team,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

Your team names Team Builder. If that block is missing, send the message to the person.

## Example

A held message from an owner bot, with made-up names:

> **Setup change: Owner operating guide**
> - Item: Owner operating guide, Rules
> - Current text: the shared rules, without a line about who changes a skill
> - Proposed text: I save facts about my unit of work, and preferences I learn while doing the work, to my own memory without asking. That does not go through Team Builder. I never decide a change to how I work: my skills, my operating guide, my routines, or a standing rule about how I do the job. When one of those should change, I tell Team Builder with Inform Team Builder. I save such a change only when Team Builder sends it after your yes.
> - Evidence: the correction in this chat (linked)
> - Act now: no. Hold for the weekly decision list.

A message Team Builder should act on now:

> **Setup change: Monday update**
> - Item: Monday update, step 2
> - Current text: save the note to the CRM before the check
> - Proposed text: run the check, then wait for a yes before the note is saved
> - Evidence: the failed run (linked), which wrote the note with a figure the source does not have
> - Act now: yes. A run wrote the wrong record.
