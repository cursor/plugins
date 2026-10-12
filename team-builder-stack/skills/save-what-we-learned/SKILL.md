---
name: save-what-we-learned
description: "Use when a task took too long or went wrong; proposes edits to the skills this session used, and changes nothing until the person picks them."
---

# Save what we learned

**Type:** workflow skill.

Turn what this session taught into edits to skills and templates, so every later run improves, not just this chat. A one-off is not a lesson. See [Definition of good](../explain-how-it-works/references/principles.md#definition-of-good).

## Steps

1. Skip it when the session was short, went as planned, or taught nothing a skill should hold. Say so in one sentence.
2. Start one fresh subagent on the conversation, and wait for it. It looks for what went wrong or took too long and what would have prevented it, and what the person corrected or had to say twice. It returns findings, each with a quote from the conversation as evidence.
3. Sort the findings into three lists:
   - **Proposed.** A clear edit to a named skill: the skill, the change in one or two lines, and the reason.
   - **Dropped.** A one-off, or already covered by a skill that was followed. One line each, with the reason.
   - **Later.** Worth doing but bigger than an edit, such as a new skill or a new bot.
4. Route each proposed edit. Save what was learned as a sharper outcome or a new example before a new rule, and offer to prune rules that outcome or example makes redundant, one at a time, after a yes. A fix to how a workflow runs goes in that workflow skill. A fix to the voice goes through Set my writing voice. A rule that should always hold for one bot type goes in its operating guide. A template fix goes where the template lives, and a template someone else owns gets a drafted change for the person to send its owner. A lesson several workflow skills need goes in one standard skill they all name, as [Standard, utility, or workflow-specific](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says. A change to the person's systems or records goes in the team spec, through Coach my bots.
5. Show all three lists, and ask which proposed edits to apply. A skill change reaches every bot that runs the skill, so never apply one without a yes, and say so when a skill proposes an edit to itself.
6. Apply the edits they chose, showing each changed skill before you save it through Grok Bot's own way of saving a skill. The helper that reviewed the session only drafts. A Team Builder skill changes through the plugin, never as an edit to a library copy. Then have Verify work read the saved version back against what was agreed before you say it's done.

## Team spec

<!-- team-builder-stack:begin spec team,workflows -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Your workflows.** If missing: Check the person’s skill library for what is already saved, and ask where each template lives today.
<!-- team-builder-stack:end spec -->

## Example

> **Proposed**
> 1. Monday update skill: load the call recorder before the notes. You pointed me to the call twice today.
> 2. Writing voice skill, through Set my writing voice: add "no greetings in customer email". You cut one from three drafts.
>
> **Dropped**
> - The CRM was slow this morning. A one-off.
>
> **Later**
> - A skill for the pre-renewal note. You wrote it by hand twice this month.
>
> Which proposed edits should I apply?
