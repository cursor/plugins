# Team spec

This is the blank team spec Build my team fills in with the person and writes to `/workspace/team-builder-stack/team-spec.md`. It's the one source of truth for how their team is put together, and the team map is built from it with the [team map template](team-map/README.md). Fill a field from the person's real systems and answers, and leave it empty rather than guess. Never put passwords, keys, customer data, or facts about one unit in it.

Keep the shape: one `- Field: value` line per field, one `### <name>` block per entry, and one line per item in a list. Copy an entry block for each new entry. Write a change here first, after a yes, then change the bot it's about, then rebuild the team map. The map is never edited by hand.

## Updated

- Version:
- Date:
- Change log:

## Your role

The person’s role, the business outcomes they drive and their KPIs, their unit of work and how many they carry, their home time zone, and the weekly bot review, with its day, time, and length.

Unit of work is what carries its own history, sized to the person’s scope of work, such as an account, a project, or a renewal book. Every routine schedule is written in the home time zone, wherever the person is when it’s made.

- Role:
- Business outcomes and KPIs:
- Unit of work:
- How many you carry:
- Home time zone:
- Weekly bot review:

## Your team

One bot blueprint for each kind of unit, plus Team Builder, and the handoffs between bots. Each blueprint links to its bot template and never copies it.

Who verifies names the specialist or manager bot that checks a bot’s work when the bot can’t start a fresh checker itself, or says none: then the bot writes nothing and tells the manager bot, or the person if there’s no manager bot, that the check couldn’t run. Add one block for each bot blueprint or single bot, named the way the person names it. Type is manager, owner, specialist, or builder. Operating guide names the skill this bot reads at the start of every task, one per bot type. Blueprint is yes when every unit of that kind gets a bot built from one bot template, and no for a single bot. A queue one owner bot owns, such as tickets or candidates, is one block. Skills are named by their slugs, never copied. Team Builder’s skills come from the installed Team Builder Stack plugin.

- Who verifies:

### Team Builder

- Type: builder
- Operating guide: team-builder-operating-guide
- Blueprint: no
- Model bot:
- Bot template:
- Skills: set-up-team-builder, build-my-team, build-a-bot, write-a-workflow-skill, coach-my-bots, check-my-bots, run-the-weekly-bot-review, clean-up-memory, retire-a-bot, set-my-writing-voice, save-what-we-learned, explain-how-it-works, triage-work, delegate-work, verify-work, plan-the-work, inform-manager-bot, run-review-panel, team-builder-operating-guide

### <Kind of unit> bot

- Type:
- Operating guide:
- Blueprint:
- Model bot:
- Bot template:
- Skills:

### Handoffs

- <From bot> to <to bot>: <what passes>. How: <how it passes>.

## Your workflows

Which skill runs each workflow and for which bot blueprint, where each workflow’s deliverable template lives, the voice skill in use, and the backlog of work worth a skill.

Add one block for each workflow. Runs on names a block under Your team. Template is the location only, never the content: “in the skill”, a Grok Bot document or canvas id, or a link plus the connector that reads it. Template owner is filled in when someone else owns it.

- Writing voice skill:

### <Workflow name>

- Skill:
- Runs on:
- Template:
- Template owner:

### Backlog

- <Workflow>: <for one unit or across units>, <how often>, <planned or skipped>.

## Systems of record

For each system: its connector, what it holds, the unique ID that finds one unit, and what it’s the system of record for. How far back to read is set in each workflow skill’s load step, not here.

Add one block for each system, named the way the person names it. Unique ID is what finds one unit there, such as the account ID.

### <System name>

- Connector:
- Holds:
- Unique ID:
- System of record for:

## Records and logs

Where each unit’s record, drafts, log, and tasks go, what each log records, where reports across units go, the team map’s canvas id or document link, the review list folder, and the skill notes folder.

What each log line records is agreed with the person; for sensitive work, keep to IDs and links. The team map is a canvas by default, so record its canvas id, or its document link when canvases aren’t available.

The task list is where each unit’s tasks are tracked and marked done, read and written with its connector. Bots mark a task done there without a yes.

Finished work is where each finished piece is filed, such as one folder or page per unit, with its name, unit, date, and link. It’s optional: without it, finished pieces are filed in the unit’s record.

- Unit record:
- Drafts:
- Unit log:
- Task list:
- Finished work:
- What each log line records:
- Reports across units:
- Team map canvas id:
- Team map document link:
- Review list:
- Skill notes:

## Kept elsewhere, not here

The spec holds only what Grok Bot doesn't already keep, and points to the rest:

- Each workflow’s steps and its “you review this” marks: the workflow skill.
- Rules about what needs a yes, and decisions that stay with the person: each bot type’s operating guide, a skill in your library, and for a rule that must never be broken, the person’s Auto Review rules too.
- A kind of bot’s operating guide, skills, and routines: its operating guide skill and the bot template its model bot exported.
- When a workflow runs: the routines of the bot that runs it.
- How far back a workflow reads: that workflow skill’s load step.
- What’s connected: the connectors.
- How the bots write: the writing voice skill.
- What each Team Builder skill does: the skill descriptions in the installed plugin.
