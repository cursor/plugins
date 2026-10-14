---
name: save-what-we-learned
description: "Use when a task took too long or went wrong; proposes skill edits and sends them through Inform Team Builder."
---

# Save what we learned

**Type:** workflow skill.

Turn what this session taught into edits to skills and templates, so every later run improves, not just this chat. A one-off is not a lesson. See [Definition of good](../explain-how-it-works/references/principles.md#definition-of-good).

## Steps

1. Skip it when the session was short, went as planned, or taught nothing a skill should hold. Say so in one sentence.
   Does: Skip the skill when the session taught nothing a skill should hold.
   Pulls from: the session
   Uses: none, this step only judges the session
   Produces: one sentence that says so, or a decision to continue
   Hands to: the next step, and it does not wait
   Needs your review: none, a skip is said in one sentence
2. Start one fresh subagent on the conversation, and wait for it. It looks for what went wrong or took too long and what would have prevented it, and what the person corrected or had to say twice. It returns findings, each with a quote from the conversation as evidence.
   Does: Start one fresh subagent on the conversation and wait for its findings.
   Pulls from: the conversation
   Uses: none, the subagent reads the conversation
   Produces: findings, each with a quote
   Hands to: the next step, and it waits for the subagent
   Needs your review: none, the subagent returns findings, it does not ask the person
3. Sort the findings into three lists:
   Does: Sort the findings into proposed, dropped, and later.
   Pulls from: the findings
   Uses: none, this step only sorts
   Produces: the three lists
   Hands to: the next step, and it does not wait
   Needs your review: none, the lists are shown in a later step
   - **Proposed.** A clear edit to a named skill: the skill, the change in one or two lines, and the reason.
   - **Dropped.** A one-off, or already covered by a skill that was followed. One line each, with the reason.
   - **Later.** Worth doing but bigger than an edit, such as a new skill or a new bot.
4. Route each proposed edit. Save what was learned as a sharper outcome or a new example before a new rule, and offer to prune rules that outcome or example makes redundant, one at a time, after a yes. A fix to how a workflow runs goes in that workflow skill. A fix to the voice goes through Set my writing voice. A rule that should always hold for one bot type goes in its operating guide. A template fix goes where the template lives, and a template someone else owns gets a drafted change for the person to send its owner. A lesson several workflow skills need goes in one standard skill they all name, as [Standard, utility, or workflow-specific](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says. A change to the person's systems or records goes in the team spec, through Coach my bots.
   Does: Route each proposed edit to the skill, guide, template, or spec that should hold it.
   Pulls from: the findings and the library
   Uses: none, this step only routes
   Produces: a destination for each proposed edit
   Hands to: the next step, and it waits when a rule is pruned after a yes
   Needs your review: pruning a rule, one at a time, after a yes
5. Show all three lists. Follow the shared rules, word for word, from Shared rules in [every bot's operating guide](../build-a-bot/references/operating-guide.md#shared-rules). When this bot is not Team Builder, do not apply the edits. Send each proposed edit to how the bot works with [Inform Team Builder](../inform-team-builder/SKILL.md): the item, the current text, the proposed text, and the evidence as links. Then stop. When Team Builder is running this skill, ask which proposed edits to apply. A skill change reaches every bot that runs the skill, so never apply one without a yes, and say so when a skill proposes an edit to itself.
   Does: Show the three lists, and send the proposed edits to Team Builder unless this bot is Team Builder.
   Pulls from: the three lists and the shared rules
   Uses: none, Inform Team Builder sends the message
   Produces: the lists, or the message to Team Builder
   Hands to: Team Builder, and it waits for which edits to apply when this bot is Team Builder
   Needs your review: which proposed edits to apply, when this bot is Team Builder
6. When Team Builder is running this skill, apply the edits the person chose. When the skill you change is used by more than one bot, run the old version and the new version on one example. A fresh checker grades both and is not told which is which. Fill every field the edit touches. A field is never blank. Write none and the reason. Run the check in [build_team_map.py](../build-my-team/references/team-map/build_team_map.py) with `--check` on the draft before you save. If it lists a missing fact, ask the person. Do not guess. Write only a rule that holds for every bot running that item. A fact about one unit of work stays in that unit's record or that bot's memory, and a request that carries one is rewritten as a general rule or declined. Show each changed skill before you save it through Grok Bot's own way of saving a skill. The helper that reviewed the session only drafts. A skill this plugin ships is not edited here. An approved change to one is the suggestion in the Review part of Run the weekly bot review, and no other way. Then have Verify work read the saved version back against what was agreed before you say it's done. Any other bot does not apply edits in this step.
   Does: Apply the edits the person chose, and grade a shared skill's old and new versions blind.
   Pulls from: the chosen edits and one example
   Uses: none, the checker reads the example
   Produces: the saved skills, or a note that this bot does not apply them
   Hands to: the person, and it waits while each changed skill is shown
   Needs your review: each changed skill, before it is saved

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
>
> When this bot is not Team Builder, it does not apply these. It sends each proposed edit to Team Builder with Inform Team Builder.
