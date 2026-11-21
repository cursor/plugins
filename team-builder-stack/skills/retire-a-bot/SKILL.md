---
name: retire-a-bot
description: "Use when a bot or group chat is replaced or its unit ended; saves history and leaves deleting to the person."
---

# Retire a bot

**Type:** workflow skill.

Replace or retire one bot or group chat, so nothing it knew is lost and nothing still points to it. You never delete a bot or a group chat: the person does, once the replacement runs cleanly.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. Name what's being retired, a bot or a group chat, and what replaces it, if anything.
   Does: Read the spec and principles, and name what is being retired and what replaces it.
   Pulls from: the team spec and the principles file
   Uses: none, this step only reads files
   Produces: what is retiring, and its replacement if any
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only names the target
2. **Save its history.** Ask the person to export its chat history, or save it where they keep records, before anything changes.
   Does: Ask the person to export the chat history, or save it where they keep records.
   Pulls from: the bot's chat history
   Uses: none, the person exports it
   Produces: the saved history
   Hands to: the person, and it waits for the export
   Needs your review: the export, before anything changes
3. **Move what lasts into the systems of record.** Read its records and log, and ask it what it knows that its records don't hold. List each durable fact and the system of record it belongs in, under Systems of record. Memory isn't a record: a fact that matters later goes into its system. Write nothing yet.
   Does: Read its records and log, and ask what it knows that those records do not hold.
   Pulls from: its records, its log, and the bot
   Uses: the connectors for the systems of record those facts belong in
   Produces: a list of durable facts and where each one belongs
   Hands to: the next step, and it waits for the bot's answer
   Needs your review: which facts to move
4. **Find everything that points to it.** Sweep the person's skills, every operating guide, about line, profile fact, and routine, the handoffs and blueprints in the team spec, its unit's records, and the team map. List each reference, one line each, with what you'd change. When a bot type's last bot retires, list its operating guide for the person to remove; never delete it.
   Does: Sweep skills, guides, profile facts, routines, handoffs, records, and the team map for references.
   Pulls from: the team spec, the library, and the team map
   Uses: none, this step only reads files
   Produces: the list of references to fix
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only lists
5. **Ask about what you can't read.** Some places you can't open, such as group chats or another bot's memory. Name each one, ask the person to look, and note that they said they looked. Don't count a place as clear until they have.
   Does: Name each place you cannot open, and ask the person to look.
   Pulls from: the person's look at those places
   Uses: none, you cannot open those places
   Produces: a note that they said they looked
   Hands to: the person, and it waits until they have looked
   Needs your review: each place you cannot open
6. **Show the plan on the team map.** Write the proposed spec beside the current one and build the map with the [team map template](../build-my-team/references/team-map/README.md), current versus proposed. Summarize every change in one plain line each: each fact to move, each reference to fix, each bot, skill, and operating guide touched. The yes covers exactly what's listed; anything else needs a new yes.
   Does: Write the proposed spec beside the current one and show both on the map.
   Pulls from: the current spec and the proposed spec
   Uses: none, the map is built from the spec
   Produces: the proposed map
   Hands to: the person, and it waits for a yes
   Needs your review: the plan, before anything changes
7. **After the yes.** Write the spec first. Record each bot's look in the proposed spec, with the current spec as the one it replaces, as [Record the looks](../build-my-team/references/team-map/README.md#record-the-looks) says, then write it over the current one. Then move the facts, fix the references, and build any replacement with Build a bot. The next weekly review flags facts about the retired bot in every other bot, as Memory: remove, for Clean up memory.
   Does: After the yes, record each bot's look, write the spec, move the facts, fix the references, and build any replacement.
   Pulls from: the approved plan
   Uses: the connectors for the systems the facts move into
   Produces: the updated spec with each bot's Shape and Color recorded, and the replacement if there is one
   Hands to: the next step, and it does not wait
   Needs your review: none, the yes in step 6 already covers the spec and the looks it records
8. **Keep the old setup paused, not deleted.** Ask the old bot to pause its routines, or guide the person to. Keep the bot and its group chats until the replacement's first clean run.
   Does: Ask the old bot to pause its routines, or guide the person to.
   Pulls from: the old bot's routines
   Uses: none, the bot pauses its own routines
   Produces: the old setup, paused and not deleted
   Hands to: the person, and it waits if you have to guide them
   Needs your review: pausing the routines, when the bot cannot do it
9. **Then the person deletes it.** After the replacement's first clean run, or once the person has checked when nothing replaces it, the person deletes the old bot or group chat themselves. If a skill only it used should go too, say so; the person deletes it, and a deleted skill is gone for every bot.
   Does: After the replacement's first clean run, the person deletes the old bot or group chat.
   Pulls from: the replacement's first clean run
   Uses: none, bots cannot delete bots
   Produces: the person's delete
   Hands to: the person, and it waits for them to delete it
   Needs your review: the delete, which only the person can do
10. Rebuild the team map from the spec.
   Does: Rebuild the team map from the spec.
   Pulls from: the team spec
   Uses: none, the map is built from the spec
   Produces: the rebuilt map
   Hands to: the person, and it does not wait
   Needs your review: none, the spec was already updated

**Reply.** What was saved and where, what was moved, what still points to the old setup and why, what's paused, and what the person deletes, and when.

## Team spec

<!-- team-builder-stack:begin spec team,workflows,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Your workflows.** If missing: Check the person’s skill library for what is already saved, and ask where each template lives today.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

The person writes: "The Account C contract ended. Retire its bot."

> Here's the plan. Nothing changes until you say yes.
>
> 1. Save: please export the Account C chat history to your records folder first.
> 2. Move: the renewal history and the last QBR notes go to the CRM's Account C page; the open questions go to the account's log.
> 3. Fix: the manager bot's daily brief still lists Account C, and its morning kickoff still names Account C. I'd remove Account C from both.
> 4. Check: I can't read the Account C group chat. Can you look for anything there that isn't in the CRM?
>
> The bot stays paused, not deleted. Once you've checked, you can delete it yourself.
