---
name: set-up-team-builder
description: "Use when the person asks to set up Team Builder; creates that one bot from the plugin after a yes."
---

# Set up Team Builder

**Type:** workflow skill.

The person's primary bot runs this. It creates one bot named Team Builder from the operating guide, about line, profile facts, and routines this plugin carries. Team Builder then creates its own routines in its own chat. You set only that bot's name and description. You never delete a bot, and you never make a second Team Builder.

## Steps

1. Check once that the person has the Team Builder Stack plugin installed. Plugins are installed for the person, not for each bot. If it isn't installed, the person adds it from Marketplace in Grok Bot, or in Cursor with `/add-plugin team-builder-stack`. Without it, Team Builder has no skills. Don't go on until the person confirms it is installed.
   Does: Check once that the Team Builder Stack plugin is installed for the person.
   Pulls from: the person's installed plugins
   Uses: none, plugins are checked in Marketplace
   Produces: installed, or a note that the person adds it
   Hands to: the person, and it waits until they confirm the install
   Needs your review: the person's confirmation that the plugin is installed
2. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. Open [Team Builder operating guide](../team-builder-operating-guide/SKILL.md), [Team Builder's profile](references/team-builder/profile.md), [Weekly review prep](references/team-builder/routines/weekly-review-prep.md), [the weekly bot review](references/weekly-bot-review.md), and [Apply a plugin update](../apply-a-plugin-update/SKILL.md). Read them fresh from the installed plugin. Never save copies of these skills, the profile, or routines into the person's skill library.
   Does: Read the spec and principles, and open the operating guide, profile, routine, and weekly review files.
   Pulls from: the team spec, the principles file, and those plugin files
   Uses: none, this step only reads files
   Produces: the current setup text
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only reads
3. Look for a bot named Team Builder, among the person's bots and under Your team. If one exists, stop and don't make a second. Message that Team Builder, in its own chat, and ask it to run Apply a plugin update. That is a request in its chat, so it answers there. Where the person's text and the plugin's overlap, theirs wins, and the edit goes back to the plugin as a suggestion the way the Review part of Run the weekly bot review says. Tell the person to continue in Team Builder's chat.
   Does: Look for a bot named Team Builder, and if one exists ask it to run Apply a plugin update.
   Pulls from: the person's bots and Your team
   Uses: none, the message goes to that bot
   Produces: a stop, and the request in Team Builder's chat
   Hands to: that Team Builder, and it does not wait in this chat
   Needs your review: none, not a yes in this chat
4. If there is no Team Builder yet, show the about line, the three profile facts, Weekly review prep, and the weekly bot review slot: the day, the time, and the length. The default slot is the one in [the weekly bot review](references/weekly-bot-review.md), unless an existing weekly bot review is already on the calendar. Do not copy that time into this skill. Summarize what you will create in one plain line each, including that review slot, and ask. The yes covers exactly what's listed, including the review slot.
   Does: If there is no Team Builder yet, show the about line, profile facts, routine, and review slot, and ask.
   Pulls from: the profile, the routine file, and the weekly bot review reference
   Uses: none, this step only reads files
   Produces: the summary of what will be created
   Hands to: the person, and it waits for the yes
   Needs your review: the summary, including the review slot
5. On a yes, create a bot named Team Builder and set its description to the about line.
   Does: On a yes, create a bot named Team Builder and set its description to the about line.
   Pulls from: the about line from the yes
   Uses: none, creating the bot is not a data connector
   Produces: the Team Builder bot
   Hands to: the next step, and it does not wait
   Needs your review: none, the yes in step 4 already covers the create
6. Settle the weekly bot review before any routine. Look for an existing one and use it. If there is none, create the invite from the step 4 summary, which that yes already covered. The length is the one in [the weekly bot review](references/weekly-bot-review.md). If no calendar is connected, give the person the title, time, length, and agenda from that meeting reference to add by hand. Save the slot under Your role as Weekly bot review, with the day, the time, and the length. Then message Team Builder its setup directly. Ask it to save the three profile facts with UpdateMemory and `tier: "profile"`, to Read the Team Builder operating guide now and follow it, and to create Weekly review prep from that routine file. Team Builder creates it in its own chat. The routine is on by default. Its schedule lives in [Weekly review prep](references/team-builder/routines/weekly-review-prep.md), in the home time zone, flexible, never late. Do not copy that schedule into this skill. The routine drafts the review pack to a dated file and posts the summary and the Needs you items in the person's chat with Team Builder before the meeting. It does not wait for an answer. Asking other bots happens when the person replies to the summary in the chat. Applying changes happens once the person says yes in the chat.
   Does: Settle the weekly bot review, using an existing one or the summary the yes already covered.
   Pulls from: the calendar, or the weekly bot review reference
   Uses: the calendar connector, when a calendar is connected
   Produces: the Weekly bot review line under Your role
   Hands to: the next step, and it does not wait
   Needs your review: none, the yes in step 4 already covers the invite and the setup
7. Ask Team Builder to report back the routines it created: each name, schedule or trigger, whether it is on or off, and its prompt. The report arrives later as its own message, so finish this turn without waiting. Do not read its routines yourself. When the report arrives, from your own turn run [Verify work](../verify-work/SKILL.md) and wait for that checker before you say the bot is set up. Give it that report, the about line, the three profile facts, the operating guide, and the profile file and routine files from step 2. The checker compares the report, the about line, and the profile facts against those files. The bot that created Team Builder does not grade that check.
   Does: Ask Team Builder to report the routines it created, and finish this turn without waiting.
   Pulls from: the routine file
   Uses: none, the report arrives later as its own message
   Produces: the request for that report
   Hands to: Team Builder, and it does not wait in this turn
   Needs your review: none, the report is not a yes
8. If the team spec exists, update Your team after a yes: Team Builder, type builder, and the skills its operating guide names. Add Weekly review prep under Routines, with its trigger and full prompt from the routine file, and leave Plugin version applied blank until Apply a plugin update records it. Make the change in a copy of the spec, record each bot's look in the copy with the saved spec as the one it replaces, as [Record the looks](../build-my-team/references/team-map/README.md#record-the-looks) says, and save the copy over the spec. Then rebuild the team map with the [team map template](../build-my-team/references/team-map/README.md). If the spec is missing, don't write one here.
   Does: If the spec exists, update Your team after a yes, add Weekly review prep under Routines, and record each bot's look.
   Pulls from: the team spec and the routine file
   Uses: none, the map is rebuilt from the spec
   Produces: the updated spec with each bot's Shape and Color recorded, and the map
   Hands to: the person, and it waits for the yes
   Needs your review: the Team Builder block, the routine, and the looks recorded, before they are written

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
> 2. One routine, Weekly review prep. On. Its schedule lives in that routine. The scheduled run drafts the review pack to a dated file and posts the summary and the Needs you items in your chat with Team Builder before the meeting, and questions and approvals wait until you reply in that chat.
> 3. A weekly bot review on your calendar, using the slot in the weekly bot review reference, unless you already have one. I will create it only after you say yes. If no calendar is connected, I will give you the details to add by hand.
>
> The Team Builder Stack plugin is installed for you, once, not on each bot. If you don't have it yet, add it from Marketplace, or in Cursor with /add-plugin team-builder-stack.
>
> Shall I create Team Builder?
