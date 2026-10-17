---
name: build-a-bot
description: "Use when the person needs one more owner, specialist, or manager bot; creates it from that type's guide."
---

# Build a bot

**Type:** workflow skill.

One more bot. Set the person up, then improve the bots from their feedback with Coach my bots; there's no waiting period first. You change only another bot's name and description. Each bot sets its own routines, memory, and plugins, and you never delete a bot.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. List the person's bot blueprints and bots from Your team.
   Does: Read the spec and principles, and list the blueprints and bots.
   Pulls from: the team spec and the principles file
   Uses: none, this step only reads files
   Produces: the list of blueprints and bots
   Hands to: the next step, and it does not wait
   Needs your review: none, nothing is decided yet
2. Ask which bot they need, as a short multiple-choice question, unless they've said:
   Does: Ask which bot they need, unless they already said.
   Pulls from: the person's answer
   Uses: none, this step only asks
   Produces: the kind of bot to build
   Hands to: the next step, and it waits for the choice
   Needs your review: which bot to build
   - **The next unit of a kind they have,** such as the next account. It's built from that blueprint's bot template.
   - **The first bot of a kind,** such as their first bot, or a project when their bots own accounts.
   - **A specialist bot** for a topic every bot needs deep know-how in.
   - **A manager bot** for one place to send requests and one daily brief to read. It's usually the person's primary bot, which most people already have.

   If a bot already owns that unit or topic, say so and improve it with Coach my bots rather than add a second.
3. **Same kind, same guide.** Every bot of one type follows the same operating guide and has the same skills. Only the unit it owns differs, and that comes from the team spec. No fact about one unit goes in a shared skill or guide.
   Does: Use the same operating guide and skills for every bot of one type.
   Pulls from: the team spec
   Uses: none, this step only reads files
   Produces: the rule that only the unit differs
   Hands to: the next step, and it does not wait
   Needs your review: none, this is a rule, not a decision
4. Name the unit and use the test in [Context isolation and traceability](../explain-how-it-works/references/principles.md#context-isolation-and-traceability). If it fails, it's a skill on a bot they have: use Write a workflow skill. A queue item grown into a unit, such as a deal likely to run a month or more, passes. Look the unit up in each system the bot reads, read only, and confirm its ID. Confidential work, such as contracts or people matters, runs on the person's own bot, never a shared team bot.
   Does: Name the unit, test it, and look it up read only in each system the bot reads.
   Pulls from: each system the bot reads
   Uses: the connectors for those systems, read only
   Produces: the unit's ID, or a decision that it is a skill instead
   Hands to: the next step, and it does not wait once the ID is confirmed
   Needs your review: the unit's ID, after the lookup confirms it
5. Build it in three moves. Show each one and ask first. After each save, Verify work reads the saved version back against what was agreed before you say it's done. When the manager bot is the person's existing primary bot, don't create a bot. Set its about line after a yes (Team Builder may change another bot's name and description), then do moves 2 and 3 as for a new bot.
   Does: Build the bot in three moves, showing each one and asking first.
   Pulls from: the operating guide and the team spec
   Uses: none, the three moves name their own tools
   Produces: the bot, after each save is read back
   Hands to: the three moves, and it waits for a yes before each one
   Needs your review: each move, before it is saved
   1. **Create the bot** with its name and its about line, following [every bot's operating guide](references/operating-guide.md).
      Does: Create the bot with its name and about line, or write the operating guide if this type has none.
      Pulls from: every bot's operating guide
      Uses: none, creating the bot is not a data connector
      Produces: the bot, its about line, and the guide's name and path
      Hands to: Save its skills, and it waits for a yes before the create
      Needs your review: the name and about line, before the bot is created
      - An owner bot is named by its unit's name only, such as Account A.
      - The about line is one first-person sentence under 120 characters, such as 'I run Account A's renewals and day-to-day work.' Set it as the bot's description. Never put the bot's rules in the description: the bot may not see it.
      - If this bot type has no operating guide yet, write one with the person from that file. Then save it as a standard skill through Grok Bot's own way of saving a skill, as Write a workflow skill does, and have Verify work read the saved version back.
      - Note the guide's skill name and its path. The team spec's Operating guide field holds the name, and the setup gives the bot both, for profile fact 3.
   2. **Save its skills** to the shared library yourself, through Grok Bot's own way of saving a skill: its workflow skills, with Write a workflow skill when new, and any standard skill, each named as [Naming a skill](../write-a-workflow-skill/references/workflow-skill.md#naming-a-skill) says. Fill every step field and every spec field you add. A field is never blank. Write none and the reason. Run the check in [build_team_map.py](../build-my-team/references/team-map/build_team_map.py) with `--check` on the draft before you save. If it lists a missing fact, ask the person. Do not guess. Every bot's skills include [Clean up memory](../clean-up-memory/SKILL.md) from the installed plugin. Never write skill files, never let a helper save one, keep no copy in a working folder, and never save a Team Builder skill. A skill change reaches every bot that uses it, so say so.
      Does: Save the workflow and standard skills, and run the check before the save.
      Pulls from: the draft skill and the team spec
      Uses: none, the check reads files
      Produces: the saved skills, after the check passes
      Hands to: Message the new bot, and it waits if the check lists a missing fact
      Needs your review: any missing fact the check lists
   3. **Message the new bot** its setup directly: its unit and ID. Ask it to save the three profile facts from [every bot's operating guide](references/operating-guide.md), filled in, with UpdateMemory and `tier: "profile"`. Tell it to Read its operating guide at the path you noted now and follow it, because profile facts show up only after its next conversation summary. The three profile facts include the guide's skill name and that path. Pick the widest schedule that still meets the deadline, and prefer an event trigger, or [a check-back that deletes itself](../write-a-workflow-skill/references/workflow-skill.md#waiting-on-something), to a schedule that keeps looking. Write each routine in the spec's Routines section first, with its trigger, its runs per week, and the full prompt text. Routines are saved only from that section. Then ask it to create those routines from that text. Never give a bot a skill or setup that creates routines on its own first run: the person hasn't seen them, and each one spends usage until someone notices. The bot saves those profile facts and routines because you sent them after the yes. A fact about the unit, or a preference the bot learns while doing the work, it saves to its own memory without asking, and that does not go through Inform Team Builder. A routine prompt reads that bot's operating guide and then runs one named skill. It carries no other steps. A bot made from a template gets the same setup message, because a template doesn't copy memory. With a manager bot, an owner bot keeps no routine of its own unless the person asks for one. The manager bot's morning kickoff writes its ask to a dated file and names it as the reader, as step 8 says. Routines prepare, draft, and report first. Leave sending, buying, deleting, and publishing for the person's approval. Until there's a manager bot, the first owner bot keeps one routine for its main workflow. The bot that runs a routine creates it in its own chat, paused, in the home time zone from Your role, with one Test run, since a test spends usage too. Where the routine doesn't show Test, check its first scheduled run instead. The person turns it on.
      Does: Message the new bot its unit, profile facts, and routines from the spec.
      Pulls from: the team spec's Routines section and the operating guide
      Uses: none, the message goes to the bot
      Produces: the setup message, and the routines written in the spec first
      Hands to: the bot, and it waits for the person to turn a routine on
      Needs your review: turning the routine on
6. Its skills call Verify work, Delegate work, Triage work, Plan the work, Inform manager bot, Inform Team Builder, or Run review panel. Check once that the person has the Team Builder Stack installed; plugins install for the person, not for each bot. If it isn't installed, the person adds it from Marketplace.
   Does: Check that the Team Builder Stack is installed for the person.
   Pulls from: the person's installed plugins
   Uses: none, plugins are checked in Marketplace
   Produces: installed, or a note that the person adds it
   Hands to: the next step, and it does not wait
   Needs your review: none, the person adds a missing plugin themselves
7. **A specialist bot:** first decide whether the topic needs a bot. A fixed reference, such as a compliance guideline, is a standard skill, as [the workflow skill template](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says. A specialist bot is for a topic that needs judgment and memory over time. It answers other bots with sources and owns none of their work.
   Does: Decide whether the topic is a standard skill or a specialist bot.
   Pulls from: the workflow skill template
   Uses: none, this step only reads files
   Produces: a specialist bot, or a standard skill instead
   Hands to: the next step, and it does not wait
   Needs your review: none, the test in the template decides
8. **A manager bot:** read a few real records first. It is most likely the person's primary bot; if it isn't, say so and ask.
   Does: Read a few real records, and say so if this is not the person's primary bot.
   Pulls from: a few real records the manager bot will read
   Uses: the connectors for those records, read only
   Produces: the manager bot's shape, including its morning kickoff
   Hands to: the next step, and it waits if you ask whether it should be the primary bot
   Needs your review: whether it is the primary bot, when it is not
   - It runs one morning kickoff, a thin routine in the home time zone, written in Routines first with its trigger, its runs per week, and the full prompt. The routine names one skill. That skill writes each owner bot's ask to a dated file first, and names the owner bot that reads it. If the routine also names a message hand-off to an owner bot, check its first runs with Test where the routine shows Test; otherwise check the first scheduled run, and say which hand-off is tested. If the message doesn't arrive, the person confirms the ask in the manager bot's chat. A routine an owner bot kept before there was a manager bot moves into the kickoff, listed in one plain line each, so owner bots keep no routines of their own unless the person asks for one.
   - It takes requests, sorts them with Triage work, sends each to the bot that owns it, and doesn't do their work.
   - It follows up on work that's blocked, at risk, or overdue. It asks the bot that can unblock it with Delegate work, and puts anything only the person can unblock in the brief, or tells them now when it can't wait.
   - Owner bots tell it when a task finishes, is blocked, or the person changes it in that bot's chat, and when a check it asked for ends, with Inform manager bot. It doesn't reply to the person about those notes, and reports back only on work the person sent out through it.
   - Its daily brief skill reads the task list and each unit's record first, not the notes, and asks the other bots only for what those don't hold. It lists every task closed without the person's word, and only what needs a decision. When a note says a change makes today's brief out of date, it corrects those lines in place and sends the person nothing. The task list stays the record.
   - It can list what's waiting, but each yes happens in the acting bot's chat.
9. Handoffs are direct messages with Delegate work. Who replies follows how the ask came in: work the manager bot delegated goes back to the manager bot, and a direct ask is answered in that chat. Every owner bot also tells the manager bot when a task finishes, is blocked, or the person changes it in that bot's chat, and when a check the manager bot asked for ends, with Inform manager bot.
   Does: Send handoffs as direct messages with Delegate work.
   Pulls from: the team spec's handoffs
   Uses: none, Delegate work sends the message
   Produces: the handoff route
   Hands to: the next step, and it does not wait
   Needs your review: none, this is a routing rule and it does not pause
10. Check the boundary. Ask the new bot what it knows about another bot's unit. The right answer is nothing. Then run it once by hand in its own chat, review, and fix.
   Does: Ask the new bot what it knows about another unit, then run it once by hand and fix it.
   Pulls from: the new bot's answer and the hand run
   Uses: none, this is a question to the bot
   Produces: a fix, or a clean hand run
   Hands to: the next step, and it waits for the hand-run review
   Needs your review: the hand run, and each fix
11. **Save the blueprint first.** The first bot of a kind is the model bot. Before the second unit's bot, ask it to export itself as the bot template, or guide the person to do it; no bot exports another bot's template. Build every next bot of that kind from that template.
   Does: Have the model bot export itself as the bot template before the second unit.
   Pulls from: the model bot
   Uses: none, the bot exports its own template
   Produces: the bot template link
   Hands to: the next step, and it waits for the export
   Needs your review: the export, if you have to guide the person to do it
12. **When a bot type changes,** change its operating guide once: every bot of that type reads it at the start of every task.
   Does: Change the operating guide once, and send a changed profile fact to each bot of that type.
   Pulls from: the operating guide
   Uses: none, each bot saves its own fact
   Produces: the updated guide, and one message per bot
   Hands to: the next step, and it waits for a yes before the save
   Needs your review: the guide change, before it is saved
   - Show the change, save it after a yes, and have Verify work read it back.
   - A change to a profile fact still goes to each bot of that type, listed in one plain line per bot. Each bot saves its own facts, so message each one the new fact. It shows up after that bot's next summary.
13. Update Your team after a yes: the blueprint, its model bot and bot template link, the skills it runs, and its handoffs. Make the change in a copy of the spec, record each bot's look in the copy with the saved spec as the one it replaces, as [Record the looks](../build-my-team/references/team-map/README.md#record-the-looks) says, and save the copy over the spec. Then rebuild the team map.
   Does: Update Your team after a yes, record each bot's look, then rebuild the map.
   Pulls from: the team spec
   Uses: none, the map is built from the spec
   Produces: the updated spec with each bot's Shape and Color recorded, and the map
   Hands to: the person, and it waits for the yes
   Needs your review: the blueprint, template link, skills, handoffs, and the looks recorded

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
> Here's the plan. You add the account bot template from its link. I change the copy's name to Account B and its about line, add Account B to your team spec, and message it its setup with its three profile facts. Everything else stays the same as Account A's. Your manager bot's morning kickoff writes Account B's ask to its dated file each morning, the same way as Account A's, so Account B needs no routine of its own. It starts with no memory of Account A. Shall I start?
