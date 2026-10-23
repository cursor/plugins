---
name: run-the-weekly-bot-review
description: "Use when the weekly bot review is coming up or under way; builds one decision list and applies the yeses."
---

# Run the weekly bot review

**Type:** workflow skill.

One numbered decision list for the weekly bot review. Prep builds it and changes nothing. The review, in chat during the meeting, applies only what the person approves.

Weekly review prep is Team Builder's one routine. The scheduled run drafts the review pack and the decision list to a dated file, posts the summary and the Needs you items in the person's chat with Team Builder, and does not wait for an answer. Asking each bot for its memory report happens when the person replies to the summary in the chat. Applying changes happens once the person says yes in the chat.

## Steps

1. **Load.** Read this skill at its path. Read the team spec, including Weekly bot review under Your role and the review list and skill notes under Records and logs. Open [the calendar invite](../set-up-team-builder/references/weekly-bot-review.md) and [Weekly review prep](../set-up-team-builder/references/team-builder/routines/weekly-review-prep.md). Open last week's review list if it exists.
   Does: Read this skill and the spec, open the review references, and copy the steps into the run checklist.
   Pulls from: the team spec, the calendar invite reference, and the Weekly review prep routine
   Uses: none, this step only reads files
   Produces: the run checklist, including any skipped step and its reason
   Hands to: Do the work, and it does not wait
   Needs your review: none, prep is read only
   Copy this skill's steps into the run's checklist. A skipped step stays listed, with its reason.
2. **Do the work.** On the scheduled run, draft the review pack. When the person replies to the summary in the chat, or when the person asks, ask the bots and fold in their replies. If the person is in the meeting, run the Review part.
   Does: Draft the review pack, follow up when the person replies, or run the Review part.
   Pulls from: the bots' reports, the skill notes, and the review list
   Uses: none, this step does not open a connector itself. Prep stays read only, and the review applies through the skills it names.
   Produces: the decision list, or the answers recorded in the review
   Hands to: the person, and the scheduled run does not wait for an answer
   Needs your review: the decision list, before anything is applied
3. **Verify.** Run [Verify work](../verify-work/SKILL.md) on the decision list before it goes to the person, and wait for it. You do not grade your own check. Each edit the review applies gets a script check, as [Verify work](../verify-work/SKILL.md#when-a-fresh-checker-isnt-needed)'s When a fresh checker isn't needed allows: the approved text is present byte for byte in every place its Lands in line names, and a diff of each named file against its dated backup shows nothing else changed. Record the script and its output. If either fails, or the script can't run, that edit gets Verify work's full check.
   Does: Have a fresh checker grade the decision list, and script check each edit the review applies.
   Pulls from: the decision list, the saved edits, and their dated backups
   Uses: none, Verify work starts the checker, and the script reads files
   Produces: a pass or fail for each check, with the script and its output for each edit
   Hands to: Record, and it waits for the checker or the script
   Needs your review: none, the checker or the script grades this
4. **Record.** File the decision list in the review list folder. Record each answer there during the review. Skill notes go in the skill notes folder, under the bot's name, with no unit's facts.
   Does: File the decision list and each answer in the review list.
   Pulls from: the person's answers
   Uses: none, this writes the review list and the skill notes
   Produces: the filed decision list and the skill notes
   Hands to: Hand off, and it does not wait
   Needs your review: none, the yes already happened
5. **Hand off.** Prep sends the person the link when the routine says. The time lives in the routine, not in this skill. The review messages each bot only what that bot applies, from this chat, and tells the person what changed.
   Does: Send the list when the routine says, and message each bot only what that bot applies.
   Pulls from: the filed decision list
   Uses: none, messages go from this chat
   Produces: the note to the person and the messages to the bots
   Hands to: the person and the bots that have something to save, and it does not wait
   Needs your review: none, the list was already approved

## Prep part

Run by Weekly review prep. The start lives in that routine, not in this skill. On the scheduled run, draft only and change nothing. When the person replies to the summary in the chat, ask for reports.

On the scheduled run, draft the review pack and the decision list from the spec, the routines, the skill notes, and the principles. Work through a, b, and d in that draft. Write them to a dated file. Post the summary and the Needs you items in the person's chat with Team Builder, and do not wait for an answer. Memory reports, and the Memory flags line, wait until replies come in. If a source is missing, say so, and do not fill it from old data. When the person replies to the summary in the chat, ask each bot to run [Clean up memory](../clean-up-memory/SKILL.md)'s Review part on itself and reply by the Weekly bot review time in the team spec. In the same message, ask each bot to list every routine it owns, or say none, with its trigger exactly as saved and its last run and result. Don't ask for run counts; counts come from the trigger and the run log. Fold each reply into c as it arrives. A broken connector found here is an Urgent item for the person. There is no separate bot for connectors.

a. **Check the bots.**

- **Plugin update.** Compare the installed plugin version with Plugin version applied in the team spec. When the installed version is newer, or none is recorded yet, put Apply a plugin update in the Plugin update section of the decision list. Do not compare only this bot's guide, profile, and routine. Where the person's text and the plugin's overlap, theirs wins, and the edit goes back as the plugin suggestion in the Review part. A person who wants updates sooner can ask Team Builder for an extra routine that runs Apply a plugin update more often.
- **Routine health.** Failed or stalled runs. Schedules outside the home time zone. A routine prompt that carries steps instead of naming one skill. Each live routine against the trigger, runs per week, and full prompt in the spec's Routines section.
- **Routine cost.** Every run spends usage, and so does a test run. For a schedule, count runs per week from the saved trigger and label it a ceiling. Give event runs and quiet runs as separate numbers, only where a run log the skill keeps shows them; otherwise write not confirmed. Count a check-back that deletes itself as one line per bot, with how many copies ran, or not confirmed. Flag a schedule that runs more than three times on any day, a trigger on a busy Slack channel, and a routine that runs more than once on some days, when its run log shows most runs found nothing. For each flag, propose one change: a wider schedule, a narrower trigger, an event trigger or a check-back that deletes itself, or a pause. It goes under Skill updates, with the spec's routine text as the current text. When the person has said usage is running high, list pauses and wider schedules before any talk of raising a limit. Change nothing in prep.
- **Full check.** Run the full [Check my bots](../check-my-bots/SKILL.md) pass while drafting the review pack. Read the principles file in full each time, and check each principle as that skill says, rather than a fixed list written here. Check every bot against the team spec and against those principles. Skip the interview. Stay read only. Do not apply fixes and do not save the spec or the map. Put each finding on the decision list with the proposed fix. The spot check stays available when the person asks.
- **Missing bots.** Draft any missing-bot proposal into the review pack. Creating a bot waits until the person says yes in the chat.
- **Memory flags.** This line waits for each bot's reply. It is not filled on the scheduled run. Once the reports are in: profile facts over 20, a "not shown" line, a setup fact out of view.

b. **Gather feedback and wins.** The week's skill notes from every bot, corrections in Team Builder's chat, and held messages from Inform Team Builder. A gap becomes a skill update with the current text, the new text, and the bots and dates that raised it. A gap raised once is "watching" unless it caused a wrong write or a failed run. A message about a failed run or a wrong write is Urgent. Any other Inform Team Builder message goes under Skill updates. A win becomes a worked example in the skill it came from. Run the Weekly refresh part of any library skill that has one, including Writing voice.

c. **Fold in memory reports.** This waits until the person replies to the summary in the chat and the bots reply. Each reply lists outdated facts to remove by exact text, setup facts to refresh, questions about the person's facts, and the profile count with whether a "not shown" line is visible. Add each item as it arrives. A bot with no reply by the Weekly bot review time in the team spec gets one line saying its report rolls to next week. Skip memory changes for a bot shared with a team: that bot's report is noted, and nothing is removed.

d. **Build the review page.** One numbered decision list. Sections: Urgent, Team, Plugin update, Skill updates, Memory, Questions. Team holds each proposed new bot. Each bot starts with a waiting line its reply replaces. Each skill update carries a "Lands in" line naming every skill and operating guide that holds the rule, labeled source of truth, pointer, or conflict. Verify work checks the list. The link goes to the person when the routine says.

## Review part

In chat, during the meeting. Take each answer by number: yes, change, or skip.

- **Team.** On a yes, run [Build a bot](../build-a-bot/SKILL.md) for each approved bot, one at a time, from this chat.
- **Plugin update.** On a yes, run [Apply a plugin update](../apply-a-plugin-update/SKILL.md) and apply only the approved items.
- **Plugin skills.** When the person approves a change to a skill this plugin ships, do not edit the local copy. Write it generically: the skill, the current text, the proposed text, and the reason, with no fact about one unit of work. Write only a rule that holds for every bot running that item. A fact about one unit of work stays in that unit's record or that bot's memory, and a request that carries one is rewritten as a general rule or declined. If the plugin maintainer named under Your team is a bot, send the suggestion with [Delegate work](../delegate-work/SKILL.md). If that name is a person, or Plugin maintainer is empty, give the person that same text to send. Where the person's text and the plugin's overlap, theirs wins, and this suggestion is how the edit goes back. Do not send it any other way.
- **Skill updates.** Keep one dated backup of each file you change. Apply exactly what was approved, in every place the Lands in line names, including an approved Inform Team Builder message, except a skill this plugin ships. That one uses the plugin suggestion above. Write only a rule that holds for every bot running that item. A fact about one unit of work stays in that unit's record or that bot's memory, and a request that carries one is rewritten as a general rule or declined. You make the change only after this yes. Message the bot when the change is to its profile facts or its routine, because only a bot changes its own memory. Check each edit with the script check in the Verify step. A routine change has no file to diff, so it gets Verify work's full check, against the spec's Routines text and the trigger and prompt the bot reports as saved, and the result says the saved state is the bot's report. A profile fact change is a read-back of that bot's own memory: the bot replies with the fact's exact saved text. Script check that it matches the approved text byte for byte, and record the output. Show the person that text labeled "Self-reviewed, not independently checked", because whether it was saved rests on the bot's own report. A setup fact changes through Build a bot. Do not edit a library copy of a skill this plugin ships.
- **Memory.** Message each bot its approved removals and refreshes, with the exact text, and ask it to run Clean up memory's Apply part. Only a bot changes its own memory. Pass on each bot's read-back with its label, "Self-reviewed, not independently checked": its counts, and each item it skipped, by exact text. Do this once the person says yes in the chat, or in the meeting. Do not apply memory changes while drafting the review pack.
- **Questions.** Each answer goes to the bot that holds the fact.
- **Record.** Write each decision on the review list. What the bots reply feeds next week's step a.

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

The scheduled run posts the summary before the meeting, when the routine says. The schedule lives in the routine, not in this skill.

> The review pack is drafted. Memory reports are still to come.
>
> 1. **Urgent.** The notes connector failed its read this morning. You'll want this first.
> 2. **Team.** One proposed owner bot, with the evidence. Nothing is created until you say yes.
> 3. **Plugin update.** The installed plugin is newer than the version in the team spec. Nothing is applied until you say yes.
> 4. **Skill updates.** Account research, step 2. Current text, new text, raised by Account A on Monday and Account B on Wednesday. Lands in: Account research (source of truth), Owner operating guide (pointer).
> 5. **Memory.** Still to come.
> 6. **Questions.** None yet. They come with the memory reports.
>
> Needs you: memory reports from each bot. They are still to come. Reply in this chat when you want each bot asked. Nothing has been changed. The link is ready when the routine says.
