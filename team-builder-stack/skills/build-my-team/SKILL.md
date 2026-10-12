---
name: build-my-team
description: "Use when the person wants their team built or has no team spec; writes the team spec and map and builds the first bot, checking existing bots first."
---

# Build my team

**Type:** workflow skill.

Builds the team for the person in this chat, in their own account, starting with one bot for one unit of work, or checks their setup if they already have bots. The person in this chat is the one you build for; never ask who the team is for. Work in your own chat with them, so they can answer approval requests. The steps say what to learn, not a script: follow their lead, use their words for their work, and skip what they've already told you.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. Look in the person's skill library for a skill with the same name as a Team Builder skill. It takes the installed plugin skill's place, so bots run it instead, and it may be the person's own skill, so never offer to remove it: summarize each in one plain line, and offer to rename it, after a yes.
2. **Someone with bots already, the faster path:** run Check my bots first. It reads their current setup, learns how they really use their bots, and builds or refreshes the team map. From their bots, skills, routines, and chats, work out what they're working on, and propose a team tailored to it, following the principles, on the map as in step 9. Ask only to confirm it or fill gaps, with the purpose questions in step 3 tailored to what you found. No generic interview.
3. **Your role and purpose.** Ask their role, and the business outcomes they drive and how each is measured, in their words: "As a CSM, I drive renewals, adoption, and expansion." Ask the three purpose questions: what they need to know, what it's for, and how it should reach them. Ask their home time zone. Every routine schedule is written in it, wherever they are when it's made.
4. **Their units.** Ask what they manage to get there: the things that carry their own history, such as accounts or projects, and how many. Size the unit to the person's scope of work. A handful of strategic accounts each get a bot. 150 renewals are one renewal book one owner bot owns. Use the test in [Context isolation and traceability](../explain-how-it-works/references/principles.md#context-isolation-and-traceability). Ask "many things or one": items in a queue, such as tickets, candidates, or leads, don't get bots. One owner bot owns the queue, and the spec gets one entry for it. When a unit is short-lived, say what you'd recommend and why, and ask.
5. **Their workflows.** Ask which workflows they repeat for each unit, by their real names, five at most. Pick one with them, usually the one they run most often. Offer Coach my bots to find more from their recent chats.
6. **The workflow skill.** Write it with Write a workflow skill. It interviews from the last real run, and reads it all back before it writes.
7. **Systems of record.** For each system the workflow reads: its connector, what it holds, the unique ID that finds one unit, and what it's the system of record for. Try each connector once, read only, on a real record. The person adds a missing connector from Marketplace and signs in themselves. Don't record how far back to read: each workflow skill's load step says that.
8. **Records and logs.** Ask where each unit's record, drafts, and log go, and where reports across units go. Ask where tasks are tracked and marked done: the task list. Ask whether finished pieces should be filed in one place, and where; it's optional. Recommend what each log records, and for sensitive work what to leave out, such as keeping to IDs and links. Agree it with them. Ask who verifies when a bot can't start a fresh checker: a specialist or manager bot, or none, so the bot writes nothing and tells the manager bot, or them.
9. **The proposed team.** When the person's primary bot already takes their requests across their work, include it in the proposal as the manager bot, keeping its name. Most people already have one. Fill in the [blank team spec](references/team-spec-template.md) from what you learned, holding only what Grok Bot doesn't already keep. Build the team map from it with the [team map template](references/team-map/README.md), marked as a proposal: a canvas when canvases are available on the account, or the Markdown document when they aren't. Show the map, summarize every bot, skill, and operating guide it will create in one plain line each, and ask before anything is built; the yes covers exactly what's listed. Then save the spec, with the version, date, and change log updated. Every later change goes into the spec first.
10. **The first bot.** Build it with Build a bot. Its type's operating guide holds the rules about what waits for a yes. For a rule that must never be broken, tell the person to add it to their Auto Review rules in Grok Bot settings too; only they can set those. Run it once by hand together, and write each fix into the skill, its template, or its type's operating guide.
11. **The team map.** Rebuild the map from the saved spec with the [team map template](references/team-map/README.md), and save its canvas id or document link under Records and logs. Rebuild it after each change, while the person is in your chat. Don't post its link in a group chat unless everyone there may see it.
12. Confirm the weekly bot review. Set up Team Builder offers it and turns on [Weekly review prep](../set-up-team-builder/references/team-builder/routines/weekly-review-prep.md), the one routine, 2 hours before the slot, in the home time zone. If the slot is missing from Your role, offer the [weekly bot review](../set-up-team-builder/references/weekly-bot-review.md) and save the day, time, and length after a yes. Do not add a second routine here. Check my bots stays available on request.

**Reply.** What exists now, when the weekly bot review is, what waits for the person's yes, whether Weekly review prep is on, and the next step: the first bot exports itself as the bot template for its kind of unit, Build a bot builds the next units' bots from it, and the person improves them from their feedback with Coach my bots.

## Team spec

<!-- team-builder-stack:begin spec role,team,workflows,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Your workflows.** If missing: Check the person’s skill library for what is already saved, and ask where each template lives today.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

The person writes: "Help me build my first bot. As a CSM, I drive renewals, adoption, and expansion. I manage twelve accounts, and for each one I run account research, account planning, stakeholder mapping, stakeholder outreach, and QBR planning."

A good reply after step 5:

> Each account carries its own history, so each one will get its own bot, all built from one account bot blueprint. Let's start with Account research, since you run it every day.
>
> Next I'll walk through the last time you ran it, step by step: which apps each step uses, which template it follows and where that lives today, and which steps you want to review before the bot carries on. What time zone are you based in? Every routine runs on that clock.
>
> **Why.** Each account gets its own bot, so what it learns stays with that account. The steps you review are where the skill pauses for your yes.
