---
name: build-a-bot
description: "Use when the person needs one more owner, specialist, or manager bot; creates it from its type's operating guide with its about line, profile facts, and setup."
---

# Build a bot

**Type:** workflow skill.

One more bot. Set the person up, then improve the bots from their feedback with Coach my bots; there's no waiting period first. You change only another bot's name and description. Each bot sets its own routines, memory, and plugins, and you never delete a bot.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. List the person's bot blueprints and bots from Your team.
2. Ask which bot they need, as a short multiple-choice question, unless they've said:
   - **The next unit of a kind they have,** such as the next account. It's built from that blueprint's bot template.
   - **The first bot of a kind,** such as their first bot, or a project when their bots own accounts.
   - **A specialist bot** for a topic every bot needs deep know-how in.
   - **A manager bot** for one place to send requests and one daily brief to read. It's usually the person's primary bot, which most people already have.

   If a bot already owns that unit or topic, say so and improve it with Coach my bots rather than add a second.
3. **Same kind, same guide.** Every bot of one type follows the same operating guide and has the same skills. Only the unit it owns differs, and that comes from the team spec. No fact about one unit goes in a shared skill or guide.
4. Name the unit and use the test in [Context isolation and traceability](../explain-how-it-works/references/principles.md#context-isolation-and-traceability). If it fails, it's a skill on a bot they have: use Write a workflow skill. A queue item grown into a unit, such as a deal likely to run a month or more, passes. Look the unit up in each system the bot reads, read only, and confirm its ID. Confidential work, such as contracts or people matters, runs on the person's own bot, never a shared team bot.
5. Build it in three moves. Show each one and ask first. After each save, Verify work reads the saved version back against what was agreed before you say it's done. When the manager bot is the person's existing primary bot, don't create a bot. Set its about line after a yes (Team Builder may change another bot's name and description), then do moves 2 and 3 as for a new bot.
   1. **Create the bot** with its name and its about line, following [every bot's operating guide](references/operating-guide.md).
      - An owner bot is named by its unit's name only, such as Account A.
      - The about line is one first-person sentence under 120 characters, such as 'I run Account A's renewals and day-to-day work.' Set it as the bot's description. Never put the bot's rules in the description: the bot may not see it.
      - If this bot type has no operating guide yet, write one with the person from that file. Then save it as a standard skill through Grok Bot's own way of saving a skill, as Write a workflow skill does, and have Verify work read the saved version back.
      - Note the guide's skill name and its path. The team spec's Operating guide field holds the name, and the setup gives the bot both, for profile fact 3.
   2. **Save its skills** to the shared library yourself, through Grok Bot's own way of saving a skill: its workflow skills, with Write a workflow skill when new, and any standard skill, each named as [Naming a skill](../write-a-workflow-skill/references/workflow-skill.md#naming-a-skill) says. Every bot's skills include [Clean up memory](../clean-up-memory/SKILL.md) from the installed plugin. Never write skill files, never let a helper save one, keep no copy in a working folder, and never save a Team Builder skill. A skill change reaches every bot that uses it, so say so.
   3. **Message the new bot** its setup directly: its unit and ID. Ask it to save the three profile facts from [every bot's operating guide](references/operating-guide.md), filled in, with UpdateMemory and `tier: "profile"`. Tell it to Read its operating guide at the path you noted now and follow it, because profile facts show up only after its next conversation summary. The three profile facts include the guide's skill name and that path. Then ask it to create its own routines. A routine prompt reads that bot's operating guide and then runs one named skill. It carries no other steps. A bot made from a template gets the same setup message, because a template doesn't copy memory. An owner bot keeps no routines of its own by default: it runs when the manager bot's morning kickoff messages it. Until there's a manager bot, the first owner bot keeps one routine for its main workflow. The bot that runs a routine creates it in its own chat, paused, in the home time zone from Your role, with Test run; the person turns it on.
6. Its skills call Verify work, Delegate work, Triage work, Plan the work, Inform manager bot, or Run review panel. Check once that the person has the Team Builder Stack installed; plugins install for the person, not for each bot. If it isn't installed, the person adds it from Marketplace.
7. **A specialist bot:** first decide whether the topic needs a bot. A fixed reference, such as a compliance guideline, is a standard skill, as [the workflow skill template](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says. A specialist bot is for a topic that needs judgment and memory over time. It answers other bots with sources and owns none of their work.
8. **A manager bot:** read a few real records first. It is most likely the person's primary bot; if it isn't, say so and ask.
   - It runs one morning kickoff, a thin routine in the home time zone. The routine wakes the manager bot's own chat and runs one named skill. From that chat turn the manager messages each owner bot to run its workflows. Owner bots' own routines move into it, listed in one plain line each.
   - It takes requests, sorts them with Triage work, sends each to the bot that owns it, and doesn't do their work.
   - It follows up on work that's blocked, at risk, or overdue. It asks the bot that can unblock it with Delegate work, and puts anything only the person can unblock in the brief, or tells them now when it can't wait.
   - Owner bots tell it when a task finishes or is blocked, with Inform manager bot. It doesn't reply to the person about those notes, and reports back only on work the person sent out through it.
   - Its daily brief skill reads the task list and each unit's record first, not the notes, and asks the other bots only for what those don't hold. It lists every task closed without the person's word, and only what needs a decision.
   - It can list what's waiting, but each yes happens in the acting bot's chat.
9. Handoffs are direct messages with Delegate work. Who replies follows how the ask came in: work the manager bot delegated goes back to the manager bot, and a direct ask is answered in that chat. Every owner bot also tells the manager bot when a task finishes or is blocked, with Inform manager bot.
10. Check the boundary. Ask the new bot what it knows about another bot's unit. The right answer is nothing. Then run it once by hand in its own chat, review, and fix.
11. **Save the blueprint first.** The first bot of a kind is the model bot. Before the second unit's bot, ask it to export itself as the bot template, or guide the person to do it; no bot exports another bot's template. Build every next bot of that kind from that template.
12. **When a bot type changes,** change its operating guide once: every bot of that type reads it at the start of every task.
   - Show the change, save it after a yes, and have Verify work read it back.
   - A change to a profile fact still goes to each bot of that type, listed in one plain line per bot. Each bot saves its own facts, so message each one the new fact. It shows up after that bot's next summary.
13. Update Your team after a yes: the blueprint, its model bot and bot template link, the skills it runs, and its handoffs. Then rebuild the team map.

**Reply.** The new bot, what it owns, what came from the template and what didn't, who messages it, and when it runs next.

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

The person writes: "Account A is set up. Do Account B next."

> Account A exported itself as the account bot template last week. I found Account B in the CRM (ID linked) and in your notes.
>
> Here's the plan. You add the account bot template from its link. I change the copy's name to Account B and its about line, add Account B to your team spec, and message it its setup with its three profile facts. Everything else stays the same as Account A's. It runs when your manager bot's morning kickoff messages it, so it needs no routine of its own. It starts with no memory of Account A. Shall I start?
