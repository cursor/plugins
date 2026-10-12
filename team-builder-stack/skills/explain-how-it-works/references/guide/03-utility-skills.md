# 3. Utility and standard skills

Every bot uses the same six utility skills, steps a workflow skill calls or builds in. Improve one once, and every bot gets the better version.

| Skill | What it does | In the Team Builder Stack |
| --- | --- | --- |
| **Triage work** | Sorts each item to a skill on this bot, the bot that owns it, or the person. | Called when work arrives as a stream of items. [Triage work](../../../triage-work/SKILL.md) |
| **Delegate work** | Runs the pieces in subagents by the plan, or sends them to the owning bot. | Called when work splits or a step belongs to another bot. [Delegate work](../../../delegate-work/SKILL.md) |
| **Verify work** | A fresh checker reopens each source and checks each claim against the standard. | Called by every Verify step before anything is saved or shown. [Verify work](../../../verify-work/SKILL.md) |
| **Plan the work** | Writes a plan sized to the work: stages, worker contracts, checks, and stop rules. | Called by Do the work when work splits or outgrows the skill’s pattern. [Plan the work](../../../plan-the-work/SKILL.md) |
| **Inform manager bot** | Marks a task done and sends the manager bot a linked note, waking it only for a block, decision, or deadline. | Called by Hand off when a task finishes or is blocked. [Inform manager bot](../../../inform-manager-bot/SKILL.md) |
| **Run review panel** | Fresh reviewers and a separate judge advise, and the person picks the changes. | Called after Verify work when a high-stakes draft needs review. [Run review panel](../../../run-review-panel/SKILL.md) |

Record keeping and context loading are built into every workflow skill’s record and load steps rather than being separate skills.

## Standard skills

Standard skills are rules the other skills follow, not steps they run. Voice is tailored to each person from their own writing. A compliance or brand guideline that already lives in a company system becomes a standard skill that holds only its link, so the team that owns it keeps one copy.

| Skill | What it does | In the Team Builder Stack |
| --- | --- | --- |
| **Voice** | How the bot sounds and the rules for anything it writes, such as tone, words to use and avoid, and the format for each place it posts, with the person’s own examples. | Your Writing voice, which [Set my writing voice](../../../set-my-writing-voice/SKILL.md) writes and keeps current |
| **Compliance guidelines** | The company’s compliance rules, such as what may be promised, what needs legal’s review, and that an open question is looked up in the sources before anyone is asked. Read fresh from where the guideline lives each run, never copied into a workflow skill. | One standard skill for each guideline you have, which [Write a workflow skill](../../../write-a-workflow-skill/SKILL.md) links from where it lives |
| **Brand guidelines** | The brand standard for anything that goes out, such as names, claims, and tone. The team that owns it keeps it current, and every skill that needs it names it. | One standard skill for each guideline you have, which [Write a workflow skill](../../../write-a-workflow-skill/SKILL.md) links from where it lives |

In the stack, every skill that writes for a person follows your Writing voice rather than copying it. Triage work, Delegate work, Verify work, Plan the work, Inform manager bot, and Run review panel are the utility skills that workflow skills call. [Triage work](../../../triage-work/SKILL.md) sorts incoming work. [Delegate work](../../../delegate-work/SKILL.md) does both parallelization and handoffs, because both send work on: to a fresh subagent on the same bot, or to the bot that owns it. [Plan the work](../../../plan-the-work/SKILL.md) writes the plan Delegate work follows when a run is bigger than its skill’s pattern. [Inform manager bot](../../../inform-manager-bot/SKILL.md) runs from the Hand off step when a task finishes or is blocked. [Verify work](../../../verify-work/SKILL.md) holds the rules for checking work, so every workflow skill’s Verify step calls it instead of restating them. [Run review panel](../../../run-review-panel/SKILL.md) is optional: a workflow skill can offer it after Verify work for a high-stakes draft, where fresh reviewers advise, a separate judge merges what they say, and you pick the changes. It never replaces Verify work.

The load step and the record step read what they need from the team spec: the systems of record, the unique ID that finds one unit, and where the record and log go. When a tool changes, you change the spec once, and every workflow skill follows.

## Three types of skill

Every skill in the stack, and every skill Team Builder writes with you, states its type under its name, and its name and description follow that type.

- **Workflow skill.** Does one job end to end. Name: a verb plus the thing, such as Draft renewal note or Triage inbox. Description: one sentence that starts with “Use when” and the trigger, within its first 60 characters, then says what you get.
- **Standard skill.** A rule other skills follow, such as the writing voice or a company’s compliance or brand guideline. Name: the guideline’s own name, in the company’s words, such as Writing voice, Compliance guidelines, or Brand voice, with no added suffix. Description: one sentence that starts with “Follow whenever” and what it covers, within its first 60 characters, then says where its source lives.
- **Utility skill.** A step that workflow skills call. Name: an explicit verb, plus the thing when the verb alone doesn’t say exactly what it does, such as Delegate work or Verify work. Description: one sentence that starts with “Called by” and the step that calls it, within its first 60 characters, then says what it checks or does.

## The five steps of every workflow skill

1. **Load.** Read this skill at its path at the start of every pass, including a rework or a resumed worker, so the pass follows the current version. Open the workflow’s template, from the skill or from its link in the person’s own system of record, and reopen the current sources for the one unit, found by its ID. The template is read fresh each run, so edits made where it lives are picked up, and a rework rebuilds from the current template, not from the earlier draft. When memory and a source disagree, the source wins. If a source is down, the bot stops and asks the person to help get it back up; in a scheduled run with nobody around, it goes on with what it has and says what was missing.
2. **Do the work.** The person’s own named steps, in their words, each with the connectors and template it uses. An open question of fact is looked up in the sources and answered with its source; only a preference goes to the person, as a short choice. The reader’s likely next questions are answered before the work is shown. A question for another bot is sent, and the work goes on without that item until the answer arrives. The skill pauses for the person’s review at each step that needs it. When the same work runs on several units, sources, or points of view, it splits across fresh subagents. When the work splits, or is bigger than the skill’s pattern covers, the bot runs Plan the work first and follows its plan.
3. **Verify.** Start a fresh subagent to check the draft and wait for it. It reopens each source and checks each claim against it, and grades the draft against every point of What good looks like, pass or fail, with a reason for each. The agent that made the draft never grades it.
4. **Record.** Save the draft and add a line to the unit’s log. File each finished piece once where finished work goes, with its name, unit, date, and link; a later pass updates that entry instead of adding another. The final write to a system of record waits for the person’s yes.
5. **Hand off.** Send the result to whoever acts next: the person, for what stays with them, or the bot that owns the next step, by direct message. When a task is finished, it’s marked done in the task list with its outcome and the link to the finished piece, and the manager bot is told with Inform manager bot without waking it; a block, a decision, or a deadline at risk wakes it.

Every workflow skill also has a template for what it produces, such as the shape of an account update, kept in one place: in the skill, in a Grok Bot document or canvas, or in your own system of record. The load step opens it fresh each run. That is [just-in-time context](../../../explain-how-it-works/references/principles.md#just-in-time-context).

Context loading and record keeping are a pair. One reads at the start and the other writes at the end, so each run starts where the last one finished.

One-off work, like a check or a coding task, doesn’t need a bot. Subagents and Cloud Agents, the feature that runs coding tasks in the background, do it and go away.

Next: [The system map](04-the-system-map.md).
