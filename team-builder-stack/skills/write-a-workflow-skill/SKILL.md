---
name: write-a-workflow-skill
description: "Use when a repeated workflow should become a skill; writes one five-step workflow skill from the person's real systems and examples, named to the standard."
---

# Write a workflow skill

**Type:** workflow skill.

One repeated workflow becomes one skill. Use it for the first bot's workflow, for new work on a unit a bot already owns, or for work that runs across all units. When another skill already did a step below, use its answers and skip the step.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full. Look for the workflow in the backlog under Your workflows.
2. Place it. Is it for one unit or across units, and which bot blueprint runs it? Use [Context isolation and traceability](../explain-how-it-works/references/principles.md#context-isolation-and-traceability): what is true about a unit stays with its bot, and how the work is done goes in the skill.
3. Break it into steps with the person, each with a short name in their words. Interview as [Interviewing for a workflow](references/workflow-skill.md#interviewing-for-a-workflow) says: one real, recent run, examples of good work, who receives the output, what starts it, how far back each step reads, whether the bot asks first or drafts first, and a probe for every vague answer. Write only the steps the person does today. For each step, name its connectors, the template it follows, where that template lives and who owns it, and whether it needs the person's review; the skill pauses at each review.
4. Check it for real. Try each connector with one read-only lookup on a real record. Open two or three recent examples of the output, and read the templates the person already uses. Ask about anything that doesn't match.
5. Sort what you learned with [Standard, utility, or workflow-specific](references/workflow-skill.md#standard-utility-or-workflow-specific). Each guideline is one standard skill, reused if the library has it; only this workflow's material goes in this skill. If this skill needs a guideline another workflow skill keeps inside itself, this is when it becomes a standard: move it into its own skill and have both name it. Then write the skill from the [workflow skill template](references/workflow-skill.md), and name and describe it as [Naming a skill](references/workflow-skill.md#naming-a-skill) says. Lead with the outcome: one or two sentences on what the finished work does for its reader. Then a few habits, each one line, then one or two worked examples from the person's real work, with made-up names. A ban goes in only where a mistake would be costly or can't be undone, and each ban says why. Fill load and record from the team spec, and have verify call Verify work. Use Delegate work when the same work runs on several units, sources, or points of view, or the next step belongs to another bot. Follow the writing voice when a person reads the output. Add Triage work when work arrives as a stream of items.
6. Put each template in one place, and let the person choose: in the skill, the default when there's none yet, drafted from the [template skeleton](references/template.md) and real examples; in Grok Bot as a document or canvas, named by its id; or at a link in their own system, read with a named connector, with no copy. Record the owner when someone else owns it. Write down what good looks like with them. See [Definition of good](../explain-how-it-works/references/principles.md#definition-of-good).
7. Keep the specifics out. Which account, which Slack channel, and what time go in the routine that runs the skill.
8. Show the full skill, and its template or where it lives. Check the name is free in the library, which every one of their bots shares, and isn't a Team Builder skill's name, which would take the plugin skill's place. Ask, then save it yourself, through Grok Bot's own way of saving a skill: never by writing a file, never through a helper, which only drafts, and with no copy left in a working folder. Then have Verify work read the saved version back against what was agreed before you say it's done.
9. Run it once on a safe, real example, review each step with the person, and write each fix into the skill or wherever its template lives.
10. Recommend how it starts from what's actually available for the tool, as [Interviewing for a workflow](references/workflow-skill.md#interviewing-for-a-workflow) orders it, and agree it with the person. Steps for a recurring job go in the skill. The routine only names that skill: it reads the operating guide and then runs the one skill, with no other steps. An owner bot's workflow runs from the manager bot's morning kickoff, or a trigger, and gets its own routine only when there's no manager bot yet. A routine is created by the bot that runs it, in its own chat, paused, with its schedule in the home time zone from Your role. Use Test run, and ask before it's turned on.
11. Update Your workflows after a yes: the skill, the bot blueprint that runs it, and where its template lives, with its owner. Take it off the backlog.

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

The person writes: "Every Friday I write a renewal note for each account that renews in the next 90 days. Make it a skill."

A good reply after step 4:

> I opened Account A in the CRM and read your last three renewal notes. They all have the same four parts: renewal date and value, usage trend, open risks, and the ask. Your steps as I heard them: Renewal pull, Usage check, Risk scan, and Draft note, and you review the draft before it goes anywhere.
>
> One thing doesn't match: two of your notes use the usage report and one uses the CRM's usage field, and they disagree for Account A. Which one should the skill trust?
