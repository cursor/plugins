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

Who verifies names the specialist or manager bot that checks a bot’s work when the bot can’t start a fresh checker itself, or says none: then the bot writes nothing and tells the manager bot, or the person if there’s no manager bot, that the check couldn’t run. Add one block for each bot blueprint or single bot, named the way the person names it. Type is manager, owner, specialist, or builder. Operating guide names the skill this bot reads at the start of every task, one per bot type. Blueprint is yes when every unit of that kind gets a bot built from one bot template, and no for a single bot. A queue one owner bot owns, such as tickets or candidates, is one block. Skills are named by their slugs, never copied. Connectors names the connectors this bot uses, or none and why. Team Builder’s skills come from the installed Team Builder Stack plugin. Plugin maintainer is optional. It names who maintains this plugin for the person. Plugin delivery is installed, or synced into the library by the plugin maintainer. Installed is the default. Synced means there is no plugin install, and the maintainer copies the stack skills into the person’s library. Those copies are how every bot reads them. An approved change to a skill this plugin ships is a suggestion, the way Run the weekly bot review says. If that name is a bot, send it with Delegate work. If it is a person, or the line is empty, Team Builder gives the person the text to send. A handoff’s ends are a bot named under Your team, You, or Every bot. Waits says whether the sender waits, and for what, or no and why.

Shape, Color, and Picture are optional, and only change how the team map draws that bot. Shape is circle, square, hexagon, capsule, leaf, or drop. Color is a hex color, such as #2563eb. Leave either empty and the map picks one from the bot's id, which is its name in lowercase with hyphens, so no two bots on the map share both. Picture is the path to a picture file on the computer your bots share, such as a PNG. The map shrinks it and shows it in place of the shape; without one, or when it can't be read, the map shows the shape and color. See the [team map template](team-map/README.md#how-each-bot-looks).

- Who verifies:
- Plugin maintainer:
- Plugin delivery: installed

### Team Builder

- Type: builder
- Operating guide: team-builder-operating-guide
- Blueprint: no
- Model bot:
- Bot template:
- Plugin version applied:
- Connectors:
- Shape:
- Color:
- Picture:
- Skills: set-up-team-builder, build-my-team, build-a-bot, write-a-workflow-skill, coach-my-bots, check-my-bots, run-the-weekly-bot-review, apply-a-plugin-update, clean-up-memory, retire-a-bot, set-my-writing-voice, save-what-we-learned, explain-how-it-works, triage-work, delegate-work, verify-work, plan-the-work, inform-manager-bot, inform-team-builder, run-review-panel, team-builder-operating-guide

### <Kind of unit> bot

- Type:
- Operating guide:
- Blueprint:
- Model bot:
- Bot template:
- Connectors:
- Shape:
- Color:
- Picture:
- Skills:

### Handoffs

- <From bot> to <to bot>: <what passes>. How: <how it passes>. Waits: <yes, for what, or no and why>.

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

Add one block for each system, named the way the person names it. Unique ID is what finds one unit there, such as the account ID. How to read is optional. It names which tool to use and the known pitfalls, or no connector.

### <System name>

- Connector:
- Holds:
- Unique ID:
- System of record for:
- How to read:

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

## Routines

Saved here only. The bot that runs a routine creates or changes the live routine from this text, in its own chat, after a yes. The weekly check compares each live routine with this section.

One block per routine. The heading is the bot and the routine’s name. Trigger is the schedule. Runs per week is how many times it runs in a normal week, counted from the trigger, such as 5 for once each weekday. For an event trigger, write about how many, and where the number came from. The weekly bot review checks it. Skill is the one skill that routine runs. Prompt is the full prompt text. Relayed by is optional. Fill it with the other bot's routine, such as the morning kickoff, when this routine works from the dated file that routine writes. Otherwise write none and the reason, or leave the line out. Copy a block for each routine.

### Team Builder: Weekly review prep

- Trigger: Weekly, starting 2 hours before the weekly bot review, in the home time zone from Your role; flexible, never late
- Runs per week: 1
- Skill: run-the-weekly-bot-review
- Prompt: Read Team Builder operating guide and follow it. Then run Run the weekly bot review, prep part.
- Relayed by: none, this routine starts on its own schedule

### <Bot name>: <Routine name>

- Trigger:
- Runs per week:
- Skill:
- Prompt:
- Relayed by:

## Kept elsewhere, not here

The spec holds only what Grok Bot doesn't already keep, and points to the rest:

- Each workflow’s steps and its “you review this” marks: the workflow skill.
- Rules about what needs a yes, and decisions that stay with the person: each bot type’s operating guide, a skill in your library, and for a rule that must never be broken, the person’s Auto Review rules too.
- A kind of bot’s operating guide and skills: its operating guide skill and the bot template its model bot exported.
- The live routine on the bot is created from the Routines section. A routine is saved only from that section.
- How far back a workflow reads: that workflow skill’s load step.
- What’s connected: the connectors.
- How the bots write: the writing voice skill.
- What each Team Builder skill does: the skill descriptions in the installed plugin.
