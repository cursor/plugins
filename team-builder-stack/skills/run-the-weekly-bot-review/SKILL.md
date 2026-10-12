---
name: run-the-weekly-bot-review
description: "Use when the weekly bot review is coming up or under way; checks the bots, gathers skill feedback and wins, flags outdated memory, builds one decision list, and applies what the person approves."
---

# Run the weekly bot review

**Type:** workflow skill.

One numbered decision list for the weekly bot review. Prep builds it and changes nothing. The review, in chat during the meeting, applies only what the person approves.

Weekly review prep is Team Builder's one routine. It wakes Team Builder's own chat and stops. A routine run can't ask anything, and it can't message another bot. From the chat turn that wake starts, Team Builder can message other bots. Do the prep in that turn.

## Steps

1. **Load.** Read this skill at its path. Read the team spec, including Weekly bot review under Your role and the review list and skill notes under Records and logs. Open [the calendar invite](../set-up-team-builder/references/weekly-bot-review.md) and [Weekly review prep](../set-up-team-builder/references/team-builder/routines/weekly-review-prep.md). Open last week's review list if it exists.
2. **Do the work.** If this turn started from Weekly review prep, or the person asks for prep, run the Prep part. If the person is in the meeting, run the Review part. Do not message another bot until this chat turn has started.
3. **Verify.** Run [Verify work](../verify-work/SKILL.md) on the decision list before it goes to the person, and again on each edit the review applies. Wait for it. You do not grade your own check.
4. **Record.** File the decision list in the review list folder. Record each answer there during the review. Skill notes go in the skill notes folder, under the bot's name, with no unit's facts.
5. **Hand off.** Prep sends the person the link to the list 15 minutes before the review. The review messages each bot only what that bot applies, from this chat, and tells the person what changed.

## Prep part

Run by Weekly review prep, starting 2 hours before the slot, done 15 minutes before it. Read only: ask for reports and change nothing.

Start in the chat turn the routine woke. First ask each bot to run [Clean up memory](../clean-up-memory/SKILL.md)'s Review part on itself and reply by the cutoff, 15 minutes before the review. Then work through a to d while replies come in. A broken connector found here is an Urgent item for the person. There is no separate bot for connectors.

a. **Check the bots.**

- **Plugin updates.** Compare Team Builder's own guide, profile, and routine with the plugin's files. Never overwrite the person's edits. Where theirs and the plugin's overlap, theirs wins, and offer to send their edit back to the plugin as a suggestion. Offer each routine change one at a time in this chat. On a yes, create or change your own routine yourself.
- **Routine health.** Failed or stalled runs. Schedules outside the home time zone. A routine prompt that carries steps instead of naming one skill.
- **Spot check.** Run the Spot check from [Check my bots](../check-my-bots/SKILL.md). Check my bots stays available on request.
- **Missing bots.** Run the Missing bots part of [Check my bots](../check-my-bots/SKILL.md). In this chat turn, never from a routine run.
- **Memory flags.** From each bot's report: profile facts over 20, a "not shown" line, a setup fact out of view.

b. **Gather feedback and wins.** The week's skill notes from every bot, and corrections in Team Builder's chat. A gap becomes a skill update with the current text, the new text, and the bots and dates that raised it. A gap raised once is "watching" unless it caused a wrong write or a failed run. A win becomes a worked example in the skill it came from. Run the Weekly refresh part of any library skill that has one, including Writing voice.

c. **Fold in memory reports.** Each reply lists outdated facts to remove by exact text, setup facts to refresh, questions about the person's facts, and the profile count with whether a "not shown" line is visible. Add each item as it arrives. A bot with no reply by the cutoff gets one line saying its report rolls to next week. Skip memory changes for a bot shared with a team: that bot's report is noted, and nothing is removed.

d. **Build the review page.** One numbered decision list. Sections: Urgent, Team, Skill updates, Memory, Questions. Team holds each proposed new bot. Each bot starts with a waiting line its reply replaces. Each skill update carries a "Lands in" line naming every skill and operating guide that holds the rule, labeled source of truth, pointer, or conflict. Verify work checks the list. The link goes to the person 15 minutes before the review.

## Review part

In chat, during the meeting. Take each answer by number: yes, change, or skip.

- **Team.** On a yes, run [Build a bot](../build-a-bot/SKILL.md) for each approved bot, one at a time, from this chat.
- **Skill updates.** Keep one dated backup. Apply exactly what was approved, in every place the Lands in line names. Have Verify work read it back. A Team Builder skill changes through the plugin, never as a library edit.
- **Memory.** Message each bot its approved removals and refreshes, with the exact text, and ask it to run Clean up memory's Apply part. Only a bot changes its own memory. Do this from this chat turn, not from a routine run.
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

The prep wake lands in Team Builder's chat two hours before Friday's review.

> I asked each bot for a memory report, due 15 minutes before the review. While those come in:
>
> 1. **Urgent.** The notes connector failed its read this morning. You'll want this first.
> 2. **Team.** One proposed owner bot, with the evidence. Nothing is created until you say yes.
> 3. **Skill updates.** Account research, step 2. Current text, new text, raised by Account A on Monday and Account B on Wednesday. Lands in: Account research (source of truth), Owner operating guide (pointer).
> 4. **Memory.** Account A: waiting. Account B: one fact to remove, exact text below.
> 5. **Questions.** One fact about you, held by Account B.
>
> Nothing has been changed. The link is ready 15 minutes before we start.
