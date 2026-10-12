---
name: set-up-team-builder
description: "Use when the person asks to set up Team Builder; creates one Team Builder bot from the plugin after a yes, or asks an existing one to run the plugin updates in its own chat."
---

# Set up Team Builder

**Type:** workflow skill.

The person's primary bot runs this. It creates one bot named Team Builder from the operating guide, about line, profile facts, and routines this plugin carries. Team Builder then creates its own routines in its own chat. You set only that bot's name and description. You never delete a bot, and you never make a second Team Builder.

## Steps

1. Check once that the person has the Team Builder Stack plugin installed. Plugins are installed for the person, not for each bot. If it isn't installed, the person adds it from Marketplace in Grok Bot, or in Cursor with `/add-plugin team-builder-stack`. Without it, Team Builder has no skills. Don't go on until the person confirms it is installed.
2. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. Open [Team Builder operating guide](../team-builder-operating-guide/SKILL.md), [Team Builder's profile](references/team-builder/profile.md), [Weekly review prep](references/team-builder/routines/weekly-review-prep.md), and [the weekly bot review](references/weekly-bot-review.md). Read them fresh from the installed plugin. Never save copies of these skills, the profile, or routines into the person's skill library.
3. Look for a bot named Team Builder, among the person's bots and under Your team. If one exists, stop and don't make a second. Message that Team Builder, in its own chat, and ask it to run the plugin updates from step a of [Run the weekly bot review](../run-the-weekly-bot-review/SKILL.md). That is a request in its chat, so it answers there. It compares its guide, profile, and routine with the plugin's files. Never overwrite edits the person made. Offer each routine change one at a time. Where theirs and the plugin's overlap, theirs wins, and Team Builder offers to send their edit back to the plugin as a suggestion. On a yes, Team Builder creates or changes its own routine itself. If Weekly review prep is missing, that missing routine is one of the differences. Tell the person to continue in Team Builder's chat.
4. If there is no Team Builder yet, show the about line, the three profile facts, Weekly review prep, and the weekly bot review slot: the day, the time, and the length. The default slot is Friday 4:00 PM for 45 minutes unless an existing weekly bot review is already on the calendar. Summarize what you will create in one plain line each, including that review slot, and ask. The yes covers exactly what's listed, including the review slot.
5. On a yes, create a bot named Team Builder and set its description to the about line.
6. Settle the weekly bot review before any routine. Look for an existing one and use it. If there is none, create the invite from the step 4 summary, which that yes already covered. Any length from 30 to 60 minutes is fine. If no calendar is connected, give the person the title, time, length, and agenda from the meeting reference to add by hand. Save the slot under Your role as Weekly bot review, with the day, the time, and the length. Then message Team Builder its setup directly. Ask it to save the three profile facts with UpdateMemory and `tier: "profile"`, to Read the Team Builder operating guide now and follow it, and to create Weekly review prep from that routine file. Team Builder creates it in its own chat. The routine is on by default and starts 2 hours before the slot just saved, in the home time zone, flexible, never late. A routine run only wakes Team Builder's own chat. From that chat turn, Team Builder can message other bots.
7. Ask Team Builder to report back the routines it created: each name, schedule or trigger, whether it is on or off, and its prompt. The report arrives later as its own message, so finish this turn without waiting. Do not read its routines yourself. When the report arrives, from your own turn run [Verify work](../verify-work/SKILL.md) and wait for that checker before you say the bot is set up. Give it that report, the about line, the three profile facts, the operating guide, and the profile file and routine files from step 2. The checker compares the report, the about line, and the profile facts against those files. The bot that created Team Builder does not grade that check.
8. If the team spec exists, update Your team after a yes: Team Builder, type builder, and the skills its operating guide names. Then rebuild the team map with the [team map template](../build-my-team/references/team-map/README.md). If the spec is missing, don't write one here.

**Reply.** Whether Team Builder was created or already existed, which routines are on, what still waits for a yes, and where to talk to Team Builder.

## Team spec

<!-- team-builder-stack:begin spec role,team -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
<!-- team-builder-stack:end spec -->

## Example

The person writes: "Set up Team Builder."

> You don't have a bot named Team Builder yet. Here's what I would create. Nothing is created until you say yes.
>
> 1. A bot named Team Builder, which follows the operating guide this plugin carries. It builds, checks, and coaches your bots, and it asks before it creates or changes anything.
> 2. One routine, Weekly review prep. On. It starts 2 hours before your weekly bot review and wakes Team Builder's chat. From that chat, Team Builder prepares the review. It does not message your other bots until that chat turn.
> 3. A weekly bot review on your calendar, Friday 4:00 PM for 45 minutes, unless you already have one. I will create it only after you say yes. If no calendar is connected, I will give you the details to add by hand.
>
> The Team Builder Stack plugin is installed for you, once, not on each bot. If you don't have it yet, add it from Marketplace, or in Cursor with /add-plugin team-builder-stack.
>
> Shall I create Team Builder?
