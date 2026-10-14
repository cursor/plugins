# The workflow skill template

Write every workflow skill in this shape, with the person. Its deliverable template, the format the work follows, such as a deck layout or a checklist, lives in exactly one place, and the person chooses which:

- **In the skill itself.** This is the default when the person has no template yet. Draft it under a heading named Template at the end of the skill, started from [template.md](template.md), and offer to move it to their own system of record later.
- **In Grok Bot itself,** as a document or a canvas, such as a morning brief whose output template is a canvas. The skill names it by its id, because canvases can't be found by listing them. Check that canvases are available before you use one, and use a document when they aren't.
- **In the person's own system of record,** such as a Notion page or a Google Doc. The skill holds only the link and the connector that reads it, and keeps no copy. When someone else owns it, record the owner next to the link, so a fix has somewhere to go. Check that the connector can open the link before you save the skill.

Whichever it is, the load step reads the template fresh each run, so edits made where it lives are picked up. If the template moves, change its location in one place: the skill's Template section.

## Interviewing for a workflow

Ask about one real, recent run, step by step, in the person's words. These are what you need to learn, not a script: follow the person's lead, adapt the words to their role, and skip what they've already told you.

- **Steps.** Each step's short name, in the order it happens. Write only the steps the person does today. A new idea is a later change, never a step you add. Ask whether each step is procedural or creative. A creative step, such as a campaign concept or a personal opening line, has the bot offer options, the case against each, and questions, and the person chooses. It gets a deliverable template only when its output has a set format. Otherwise it gets examples of good work and a description of what good looks like.
- **What good looks like.** One or two past pieces of work they're proud of, and one that went less well. Read them, name what made the good ones good, and ask the person to confirm each point.
- **Templates and standards.** For each step, the template or standard it follows and where it lives today: in a Grok Bot document or canvas, a page in their own system, such as Notion or Google Docs, or nowhere yet, and who owns it. A template someone else owns, such as another team's checklist, is linked and never edited. When a run shows it's missing something, draft a suggested change for the person to send to its owner.
- **Inputs and systems of record.** What each step reads, how far back it reads, and which system settles each fact when two disagree. Check with one read-only lookup on a real record.
- **Review points.** Which steps the person needs to see before the bot carries on, now and after a month of good runs. A review point is the person reviewing the work themselves, for example "you review the deck before you take it to your manager". Their manager's sign-off, or anyone else's, happens outside the workflow, between the person and them, so the skill neither runs nor tracks it.
- **Cadence and triggers.** What starts it, and how far ahead. Use an event trigger only where the app offers one for that system, and otherwise a schedule. Recommend a routine or a trigger from what's actually available for the tool, and agree it with the person. Every run spends usage, and a test run does too. Ask how late the work can start and still be on time, and pick the widest schedule that meets that. Write down how many times it will run in a week. When it should start as soon as something happens, recommend, in this order by default: a trigger for the tool itself where one exists, such as PagerDuty, Sentry, Linear, Microsoft Teams, GitHub, email sent to the bot's own inbox, or a webhook; then the Slack message the tool already posts; then a schedule, which runs at most every 5 minutes. An email trigger only works for mail sent to the bot's own inbox, not the person's, so keep a scheduled check of the person's inbox unless the mail can be forwarded or sent to the bot. Don't rely on a Slack direct message to start a routine. When a schedule can't express the timing, such as a working day of the month, run a daily routine that checks the calendar first.
- **Many things or one.** If the work runs over many things, ask whether each one carries its own history and gets its own bot, or is an item in a queue that one bot owns, such as tickets, candidates, leads or new hires. Ask when an item grows into something that deserves its own bot.
- **Sensitive data.** What must never be copied out of its system into drafts, the log, memory or the team spec, such as personal details, interview feedback, pay or confidential terms. Recommend what the log should record for this work and what to leave out, such as keeping to IDs and links, and agree it with the person. Confidential work runs on the person's own bot, never one shared with a team.
- **Who receives the output,** what waits for a yes before it reaches them, and where it goes out from. The bot writes drafts into the person's own tool, such as their email or sequencing platform, and the person sends.
- **What the bot must never do** in this workflow.
- **Ask first, or draft first.** Whether the bot should ask the person a few questions before it drafts, a short discovery for this skill, or take a first pass itself and bring it for review. For example, someone may want their Draft weekly 1-1 skill to start with a few questions about what's on their mind.

**Probe vague answers.** When an answer is an adjective or "everything", such as "crisp", "strategic" or "I pull from all over", ask for an example or the last real case. When two answers or two sources disagree, say so and ask which is right. When a step overlaps another workflow, ask where the boundary is, and turn the overlap into a handoff rather than two skills doing the same work.

**Read it back** before you write anything: the steps, what good looks like, where each template lives, which standard and utility skills are reused and which are new, the skill's name and description, and what you're still unsure about.

## Standard, utility, or workflow-specific

Before you write anything into a skill, sort it:

- **A standard** is a rule more than one workflow follows, such as a compliance guideline, the writing voice or a brand standard. It becomes one standard skill that every workflow needing it points to. If it already lives in the person's own system, such as a guideline page in Notion, the standard skill holds only the link and the connector that reads it. Never copy a standard into a workflow skill.
- **A utility** is a step more than one workflow calls, such as Verify work, Delegate work or Triage work. The Team Builder Stack ships these; call them, never restate them. A guideline someone else owns, such as legal's contract positions or another team's policy, is still one standard skill holding its link, and no skill edits it. A threshold or number from a policy is read from that guideline each run, never typed into a workflow skill.
- **Workflow-specific** material is needed by one workflow only, such as its steps, its review points or a scoring rule only it uses. It goes in that workflow skill.
- **One standard skill per guideline.** Each guideline, such as a compliance rule, a brand standard or a policy, is its own standard skill. Not every workflow needs every guideline, but a workflow skill that needs one names it.
- **Check the library first.** Before you write a new standard or a new skill, look for one that already covers it, and reuse it. If two skills already hold the same thing, propose merging them.
- **When it isn't clear,** say what you're unsure about and ask: "Does anything besides this workflow use this?" Until the person answers, keep it in the workflow skill and mark it as a candidate standard.

A quick test: if this changed tomorrow, how many skills would need the same edit? One means workflow-specific. More than one means a standard.

## Naming a skill

Every skill states its type on the line under its name, and its name and description follow that type. Name a new skill this way, and check its name is free in the library.

<!-- team-builder-stack:begin skill-types -->
- **Workflow skill.** Does one job end to end. Name: a verb plus the thing, such as Draft renewal note or Triage inbox. Description: one sentence that starts with “Use when” and the trigger, within its first 60 characters, then says what you get.
- **Standard skill.** A rule other skills follow, such as the writing voice or a company’s compliance or brand guideline. Name: the guideline’s own name, in the company’s words, such as Writing voice, Compliance guidelines, or Brand voice, with no added suffix. Description: one sentence that starts with “Follow whenever” and what it covers, within its first 60 characters, then says where its source lives.
- **Utility skill.** A step that workflow skills call. Name: an explicit verb, plus the thing when the verb alone doesn’t say exactly what it does, such as Delegate work or Verify work. Description: one sentence that starts with “Called by” and the step that calls it, within its first 60 characters, then says what it checks or does.
<!-- team-builder-stack:end skill-types -->

Keep each description to one sentence under 120 characters, with the trigger first. A bot's skill catalog can cut every description to a few dozen characters, and the trigger is what has to survive. No em dash or en dash.

## The five steps

<!-- team-builder-stack:begin workflow-steps -->
1. **Load.** Read this skill at its path at the start of every pass, including a rework or a resumed worker, so the pass follows the current version. Copy this skill's steps into the run's checklist. A skipped step stays listed, with its reason, so Verify work and the weekly spot check can see it. Open the workflow’s template, from the skill or from its link in the person’s own system of record, and reopen the current sources for the one unit, found by its ID. The template is read fresh each run, so edits made where it lives are picked up, and a rework rebuilds from the current template, not from the earlier draft. When memory and a source disagree, the source wins. If a source is down, the bot stops and asks the person to help get it back up; in a scheduled run with nobody around, it goes on with what it has and says what was missing.
2. **Do the work.** The person’s own named steps, in their words, each with the connectors and template it uses. An open question of fact is looked up in the sources and answered with its source; only a preference goes to the person, as a short choice. The reader’s likely next questions are answered before the work is shown. A question for another bot is sent, and the work goes on without that item until the answer arrives. The skill pauses for the person’s review at each step that needs it. When the same work runs on several units, sources, or points of view, it splits across fresh subagents. When the work splits, or is bigger than the skill’s pattern covers, the bot runs Plan the work first and follows its plan.
3. **Verify.** Start a fresh subagent to check the draft and wait for it. It reopens each source and checks each claim against it, and grades the draft against every point of What good looks like, pass or fail, with a reason for each. The agent that made the draft never grades it.
4. **Record.** Save the draft and add a line to the unit’s log. File each finished piece once where finished work goes, with its name, unit, date, and link; a later pass updates that entry instead of adding another. The final write to a system of record waits for the person’s yes.
5. **Hand off.** Send the result to whoever acts next: the person, for what stays with them, or the bot that owns the next step, by direct message. When a task is finished, the person changes one in chat, or a check the manager bot asked for ends, the task list is updated, and the manager bot is sent the note with Inform manager bot; a block, a decision, a deadline at risk, or a change to today’s brief is sent so the manager bot acts on it now.
<!-- team-builder-stack:end workflow-steps -->

Each step reads what it needs from the team spec every run, so a change to a tool is one change to the spec.

## How to fill each step

- **Load.** Read this skill at its path at the start of every pass, including a rework and a resumed worker. A Read at the start of a turn sees the current version; the skill list's descriptions refresh only when the conversation is summarized. Use the team spec's Systems of record: the unique ID that finds one unit in each system the workflow reads. State how far back this workflow reads in each one, such as since the last run. The spec holds no default. Open the template from where it lives: the skill's Template section, or its link, read with its connector. Load only this unit's material, found by its ID. If a source the workflow needs is down, stop and ask the person to help get it back up before going on; in a scheduled run with nobody around, go on with what you have, and say what was missing in the daily brief or its report. Hand on a short summary: what the record says, what changed recently with links, and the rules that apply. When a routine starts the skill, Load opens with a cheap check, and a run a person starts skips it: has anything this skill reads changed since the last run? The skill names what counts as a change. That can include work that falls due with nothing new, such as a wait that has run out or the day's last run closing something out. Look only at what is quick to see, with one quick read per source, such as a new message, a changed row, or a meeting that ended. A source that can't be read counts as a change, so it never ends the run as a quiet one; go on as the rule for a source that is down says. If nothing changed, end the run there. Open nothing else and send nothing. Add one line that says nothing changed to the run log the skill names, so quiet runs can be counted. The routine, not the skill, holds which unit to check and when it runs.
- **Do the work.** The person's own steps, in their words, one indented block each under Do the work. Each step is plain lines, not a table and not YAML. Does: what it does. Pulls from: the record or source. Uses: the connector. Produces: what the step makes. Hands to: who acts next, and whether this step waits. Needs your review: what the person reviews. A field is never blank. Write none and the reason. Look up every open question of fact in the sources, and answer it with its source. Ask the person only for a preference, as a short choice, and never offer to go ahead anyway on a fact. Answer the reader's likely next questions before the work is shown. When a fact belongs to another bot, send the question with Delegate work, finish the turn with the work minus that item, marked as waiting, and fill it in when the answer arrives. Pause and wait for a yes at each step that needs the person's review. When the same work runs on several units, sources, or points of view, split it with Delegate work, and write the default pattern into the skill: which pieces run side by side, which wait on others, what each one gets and the shape it returns, how the results combine, and its limits, such as how many at once. When the work splits, or is bigger than that pattern covers, run [Plan the work](../../plan-the-work/SKILL.md) first. It fits the pattern to this run, writes one worker contract per stage, and says when it departs from the pattern. When the output is for a person, run the voice skill. Don't copy the voice rules into the workflow skill.
- **Verify.** Run [Verify work](../../verify-work/SKILL.md), which holds the rules for checking work, and wait for its result. When Verify work allows a script or a labeled self-review, the Verify step says which one, why, and what covers it. When the work ran in subagents, they return their results and stop, and the bot starts Verify work from its own turn; a subagent never tries to start it. Give it the draft, the unit's ID, this skill, the sources that settle each fact from the team spec's Systems of record, and this skill's What good looks like for the standard and the claims that always get checked. Give it every point of this skill's What good looks like, so each is graded pass or fail with a reason. Name each separate thing to check, so it runs one check for each. When a guideline applies, the record notes which version or date the check used. For a high-stakes draft, such as a customer deck, the skill can offer [Run review panel](../../run-review-panel/SKILL.md) after Verify work passes; it advises, the person picks the changes, and it never replaces Verify work.
- **Record.** Use the team spec's Records and logs. Save the draft where drafts wait, and add a line to the unit's log, the bot's running record of the changes it made on its unit: what changed, when, the source with its link, and why. What the log records, and what it leaves out for sensitive work, is what was agreed with the person in the interview. The final write to the system of record waits for the person's yes, one yes for each write. File each finished piece once, where Records and logs says finished work goes, or in the unit's record: its name, unit, date, and link. When a later pass changes it, update that entry; never add a second one.
- **Hand off.** Name who acts next. The person gets what stays with them. When a step belongs to another bot, send it with Delegate work. Who replies depends on how the ask came in, as Delegate work says: work a manager bot delegated goes back to the manager bot, which closes the loop with the person; work the person asked for directly is answered in that chat. When a task is finished, the person changes one in chat, or a check the manager bot asked for ends, update the task list from the team spec's Records and logs, and run [Inform manager bot](../../inform-manager-bot/SKILL.md). It sends no note when the manager bot delegated the work, because the hand-back is the note, except a change the person made in chat or a check the manager bot asked for, which always gets a note. For a check, that note is the hand-back, so send one message, not two. When the work is blocked, needs a decision, a deadline is at risk, or a change makes today's brief out of date, run Inform manager bot right away.

## Waiting on something

When a step waits on a reply or an event, such as a high-priority email waiting on an answer, use an event trigger where the app offers one for it. Otherwise the bot sets itself a check-back: a routine, created in its own chat, that looks again at a set time and is deleted once the wait is over. When the start depends on a calendar, a weekly routine that looks ahead is an acceptable fallback. Each look spends usage, so space the looks as widely as the wait allows.

Schedules run at least 5 minutes apart, a bot can own up to 50 routines, and deleting a routine can't be undone. Whether a routine can run just once, and whether a bot can set one up during unattended work without a yes, aren't publicly documented, so check before you rely on either. Until then, a check-back routine deletes itself, or asks the person to delete it, once its wait is over.

## The skeleton

Fill every slot marked with angle brackets from what you checked in the person's real systems and examples. Ask about any slot you can't fill that way. Bans is optional: leave that section out when no mistake would be costly or can't be undone. Keep specifics, such as which account and when, in the routine that runs the skill.

```markdown
---
name: <the name below as a slug, such as draft-renewal-note>
description: "Use when <what starts it for one unit: a routine, a request, or a handoff>; <what it produces for that unit>."
---

# <A verb plus the thing, such as Draft renewal note>

**Type:** workflow skill.

<One or two sentences on what the finished work does for its reader.>

Runs for one <unit> at a time, found by its ID. It pauses for the person's review at: <the steps that need review>.

Before drafting: <ask the person these few questions first, or take a first pass and bring it for review>.

## Habits

- <One habit, one line.>
- <One habit, one line.>

## Examples

<One or two worked examples from the person's real work, with made-up names.>

## Bans

- <Only where a mistake would be costly or can't be undone, with why; otherwise leave this section out.>

## Steps

1. **Load.**
   Does: Read this skill at its path and copy its steps into the run's checklist.
   Pulls from: the team spec and <the unit's record and recent sources>
   Uses: <the connector that reads the template, and the connector the opening check reads, if any, or none and why>
   Produces: the checklist for this run, including any skipped step and its reason
   Hands to: Do the work, and it does not wait
   Needs your review: none, nothing is decided yet
   <When a routine starts this skill: what counts as a change since the last run, including anything that falls due, and how to see it with one quick read per source. A source that can't be read counts as a change. If nothing changed, end the run here with one line in the run log the skill names. Leave this line out when only a person starts it.>
   Read the team spec. Open the template, as the Template section below says, and read it fresh. Reopen <the unit's record and recent sources>, found by the unique ID the spec names, back to <how far back this workflow reads, such as since the last run>, for this <unit> only. When memory and a source disagree, the source wins. If a source is down, stop and ask the person to help get it back up; in a scheduled run with nobody around, go on and say what was missing. A skipped step stays listed, with its reason.
2. **Do the work.**
   Does: Look up every open question of fact and draft the work in the person's steps.
   Pulls from: the sources opened in Load
   Uses: <the connectors the steps name, or none and why>
   Produces: the draft
   Hands to: Verify, and it waits where a step says so
   Needs your review: <the steps that need review, or none and why>
   Ask the person only for a preference, as a short choice, and never go ahead on an unchecked fact. Answer the reader's likely next questions before the work is shown. When a fact belongs to another bot, send the question, finish this turn with the work minus that item, marked as waiting, and fill it in when the answer arrives later as its own message. When the work splits, or is bigger than <the default pattern: the pieces, what runs side by side, what each returns, and the limit at once> covers, run Plan the work first and follow its plan.
   1. **<Short name>.**
      Does: <what this step does, in the person's words>
      Pulls from: <the record or source, or none and why>
      Uses: <the connector, or none and why>
      Produces: <what this step produces, or none and why>
      Hands to: <who acts next, and whether it waits, or none and why>
      Needs your review: <what they review, or none and why>
   2. **<Short name>.**
      Does: <what this step does, in the person's words>
      Pulls from: <the record or source, or none and why>
      Uses: <the connector, or none and why>
      Produces: <what this step produces, or none and why>
      Hands to: <who acts next, and whether it waits, or none and why>
      Needs your review: none, this step runs on without a review
3. **Verify.**
   Does: From this bot's own turn, never from inside a subagent, run Verify work and wait for it.
   Pulls from: the draft, the <unit>'s ID, and <the sources that settle each fact>
   Uses: none, Verify work starts the checker
   Produces: a pass or fail for each point, with a reason
   Hands to: Record, and it waits for the checker
   Needs your review: none, the checker grades this
4. **Record.**
   Does: Save the draft and add a line to the <unit>'s log.
   Pulls from: the checker's result and <where drafts wait>
   Uses: <the connector for the log, or none and why>
   Produces: the saved draft and the log line
   Hands to: Hand off, and the final write waits for a yes
   Needs your review: the final write to <the system of record>
5. **Hand off.**
   Does: Send the result to whoever acts next and mark finished tasks done.
   Pulls from: the saved draft and <the task list>
   Uses: none, Delegate work sends the message
   Produces: the handoff and the closed tasks
   Hands to: <the person, or the bot that owns the next step, and whether it waits>
   Needs your review: none, unless a send still needs a yes

## What good looks like

- <What the person said good looks like.>
- Leads with the outcome; bans only where a mistake is costly, each with its reason.
- Every fact has its link.
- Nothing was written to a system of record without a yes.
- Each finished task is marked done, and the manager bot was told.

## Template

<One of these two, never both:>

<In this skill: the template itself, started from the template skeleton and the person's real examples.>

<Or a Grok Bot document or canvas: Morning brief template, Grok Bot canvas, id <the canvas id>. Don't copy it here.>

<Or a link: Account plan template, Notion page, read with the Notion connector. Link: <the page's link>. Don't copy it here.>
```
