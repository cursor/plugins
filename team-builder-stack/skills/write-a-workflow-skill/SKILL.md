---
name: write-a-workflow-skill
description: "Use when a repeated workflow should become a skill; writes one five-step skill from real examples."
---

# Write a workflow skill

**Type:** workflow skill.

One repeated workflow becomes one skill. Use it for the first bot's workflow, for new work on a unit a bot already owns, or for work that runs across all units. When another skill already did a step below, use its answers and skip the step.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. Look for the workflow in the backlog under Your workflows.
   Does: Read the spec and principles, and look for the workflow in the backlog.
   Pulls from: the team spec and the principles file
   Uses: none, this step only reads files
   Produces: the backlog entry, or a note that it is new
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only reads
2. Place it. Is it for one unit or across units, and which bot blueprint runs it? Use [Context isolation and traceability](../explain-how-it-works/references/principles.md#context-isolation-and-traceability): what is true about a unit stays with its bot, and how the work is done goes in the skill.
   Does: Decide whether it is for one unit or across units, and which blueprint runs it.
   Pulls from: the principles file and Your team
   Uses: none, this step only reads files
   Produces: the placement
   Hands to: the next step, and it does not wait
   Needs your review: none, the isolation test decides
3. Break it into steps with the person, each with a short name in their words. Interview as [Interviewing for a workflow](references/workflow-skill.md#interviewing-for-a-workflow) says: one real, recent run, examples of good work, who receives the output, what starts it, how far back each step reads, whether the bot asks first or drafts first, and a probe for every vague answer. Write only the steps the person does today. For each step, name its connectors, the template it follows, where that template lives and who owns it, and whether it needs the person's review; the skill pauses at each review.
   Does: Break the work into the person's own steps, from one real run.
   Pulls from: that run, their examples, and where each template lives
   Uses: the connectors they name for each step
   Produces: the step list, including which steps need review
   Hands to: the next step, and it waits through the interview
   Needs your review: the steps, the templates, and which reviews to keep
4. Check it for real. Try each connector with one read-only lookup on a real record. Open two or three recent examples of the output, and read the templates the person already uses. Ask about anything that doesn't match.
   Does: Try each connector with one read-only lookup, and read the templates they already use.
   Pulls from: one real record, and two or three recent examples
   Uses: each connector the workflow names, read only
   Produces: what matches, and what does not
   Hands to: the person, and it waits if something does not match
   Needs your review: anything that does not match
5. Sort what you learned with [Standard, utility, or workflow-specific](references/workflow-skill.md#standard-utility-or-workflow-specific). Each guideline is one standard skill, reused if the library has it; only this workflow's material goes in this skill. If this skill needs a guideline another workflow skill keeps inside itself, this is when it becomes a standard: move it into its own skill and have both name it. Then write the skill from the [workflow skill template](references/workflow-skill.md), and name and describe it as [Naming a skill](references/workflow-skill.md#naming-a-skill) says. Lead with the outcome: one or two sentences on what the finished work does for its reader. Then a few habits, each one line, then one or two worked examples from the person's real work, with made-up names. A ban goes in only where a mistake would be costly or can't be undone, and each ban says why. Fill load and record from the team spec, and have verify call Verify work. When a routine will start the skill, Load opens with the cheap check in [How to fill each step](references/workflow-skill.md#how-to-fill-each-step). Use Delegate work when the same work runs on several units, sources, or points of view, or the next step belongs to another bot. Follow the writing voice when a person reads the output. Add Triage work when work arrives as a stream of items.
   Does: Sort guidelines into standard skills, then write this skill from the template.
   Pulls from: the team spec, for load and record
   Uses: none, the utilities are named while writing, not called
   Produces: the skill draft
   Hands to: the next step, and it does not wait
   Needs your review: none, the draft is shown in a later step
6. Put each template in one place, and let the person choose: in the skill, the default when there's none yet, drafted from the [template skeleton](references/template.md) and real examples; in Grok Bot as a document or canvas, named by its id; or at a link in their own system, read with a named connector, with no copy. Record the owner when someone else owns it. Write down what good looks like with them. See [Definition of good](../explain-how-it-works/references/principles.md#definition-of-good).
   Does: Put each template in one place, and let the person choose where.
   Pulls from: the template skeleton and their real examples
   Uses: the named connector, when the template lives in their system
   Produces: the template, or its location and owner
   Hands to: the person, and it waits for the choice
   Needs your review: where the template lives, and what good looks like
7. Keep the specifics out. Which account, which Slack channel, and what time go in the routine that runs the skill.
   Does: Keep the account, the channel, and the time out of the skill.
   Pulls from: the routine that will run the skill
   Uses: none, this step only sorts what belongs in the routine
   Produces: a skill with those specifics removed
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only sorts
8. Fill every step field: Does, Pulls from, Uses, Produces, Hands to, and Needs your review. A field is never blank. Write none and the reason. Run the check in [build_team_map.py](../build-my-team/references/team-map/build_team_map.py) with `--check` on the draft before you save. If it lists a missing fact, ask the person. Do not guess. Then show the full skill, and its template or where it lives. Check the name is free in the library, which every one of their bots shares, and isn't a Team Builder skill's name, which would take the plugin skill's place. Ask, then save it yourself, through Grok Bot's own way of saving a skill: never by writing a file, never through a helper, which only drafts, and with no copy left in a working folder. Then have Verify work read the saved version back against what was agreed before you say it's done.
   Does: Fill every field, run the check, show the skill, and save it after they agree.
   Pulls from: the draft and the check's list
   Uses: none, the check reads files
   Produces: the saved skill
   Hands to: the person, and it waits for the yes to save
   Needs your review: the full skill, before it is saved
9. Run it once on a safe, real example, review each step with the person, and write each fix into the skill or wherever its template lives.
   Does: Run the skill once on a safe example and write each fix into the skill or its template.
   Pulls from: that example
   Uses: the connectors the skill names
   Produces: the fixes
   Hands to: the next step, and it waits while you review each step
   Needs your review: each step of the example run
10. Recommend how it starts from what's actually available for the tool, as [Interviewing for a workflow](references/workflow-skill.md#interviewing-for-a-workflow) orders it, and agree it with the person. Pick the widest schedule that still meets the deadline. Prefer an event trigger, or a check-back that deletes itself, to a schedule that keeps looking. Steps for a recurring job go in the skill. The routine only names that skill: it reads the operating guide and then runs the one skill, with no other steps. With a manager bot, an owner bot's workflow gets its ask from the manager bot's morning kickoff, as a dated file, or from a trigger, and gets its own routine only when there's no manager bot yet, or the person asks. Write the routine in the spec's Routines section first, with the trigger, its runs per week, and the full prompt text. Routines are saved only from that section. The bot that runs it creates or changes the live routine from that text, in its own chat, paused, with its schedule in the home time zone from Your role. Use Test where the routine shows Test; otherwise check the first scheduled run. A test does real work and spends usage, so don't repeat it for the same result. Ask before it's turned on.
   Does: Agree how it starts, write the routine in the spec, and ask before it is turned on.
   Pulls from: the team spec's Routines section and Your role
   Uses: none, the live routine is created in the bot's chat
   Produces: the routine in the spec, with its runs per week
   Hands to: the bot that runs it, and it waits for the yes to turn it on
   Needs your review: turning the routine on
11. Update Your workflows after a yes: the skill, the bot blueprint that runs it, and where its template lives, with its owner. Take it off the backlog.
   Does: Update Your workflows after a yes, and take the workflow off the backlog.
   Pulls from: the team spec
   Uses: none, this step writes the spec
   Produces: the updated Your workflows section
   Hands to: the person, and it waits for the yes
   Needs your review: the skill, the blueprint, and where the template lives

**Reply.** The skill's name, what it does, which bot runs it and when, and what waits for a yes.

## What good looks like

- Leads with the outcome; bans only where a mistake is costly, each with its reason.

## The five workflow steps

Every workflow skill runs the five steps in [the workflow skill template](references/workflow-skill.md#the-five-steps), in order. Its template lives in one place: in the skill, in a Grok Bot document or canvas, or at a link in the person's own system of record, read with a named connector.

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

The person writes: "I keep writing a renewal note for each account that is coming up for renewal. Make it a skill."

A good reply after step 4:

> I opened Account A in the CRM and read your last three renewal notes. They all have the same four parts: renewal date and value, usage trend, open risks, and the ask. Your steps as I heard them: Renewal pull, Usage check, Risk scan, and Draft note, and you review the draft before it goes anywhere.
>
> One thing doesn't match: two of your notes use the usage report and one uses the CRM's usage field, and they disagree for Account A. Which one should the skill trust?
