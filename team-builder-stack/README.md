# Team Builder Stack

## About me

<!-- team-builder-stack:begin about -->
I'm Danny Graziosi, an AI Deployment Manager at SpaceXAI. I help large enterprises shape their AI deployment strategy, run enablement across the SpaceXAI product suite, and put agentic workflows into production.

Before SpaceXAI, I spent two years leading agentic workflow rollouts for Fortune 500 companies in financial services, healthcare, and consumer goods. The work spanned marketing, sales, finance, investment banking, portfolio management, and document processing.

Along the way I built a framework and a set of design principles for putting agents to work in any business process. Team Builder Stack packages both as a set of skills and a bot template, so you can build your own team of bots.

[Danny Graziosi on X](https://x.com/danny_graziosi)
<!-- team-builder-stack:end about -->

## How it works

Think of each bot as a new teammate. Your team has three kinds of bots.

- **Manager bots.** Keep the team moving. A manager takes requests that don't belong to one bot, delegates them, follows up, and briefs you. It's usually your primary bot, and most people start with a Chief of Staff.
- **Owner bots.** Each owns one part of your work, like an account, a project, or a renewal book, and keeps its history.
- **Specialist bots.** Hold know-how that every owner draws on, like product expertise or your company's operating model.

You can talk to any bot directly. Go to an owner about its account, to a specialist for its expertise, and to your manager when you're not sure who should take something or the work spans several bots. Nothing is sent or changed without your yes.

## Seven steps to build your team

You build the team the same way you'd bring on real people.

1. **Decide who owns what.** Give a bot to each part of your work that carries its own history, and size each part to your scope of work. If you look after a handful of strategic accounts, each one gets its own bot. If you handle 150 renewals, one bot owns the renewal book. Work that doesn't carry its own history becomes a skill, not a bot.
2. **Connect your systems.** Like a new hire's IT setup on day one, each bot gets access to the systems it needs, such as your CRM, notes, calendar, and docs. It checks those systems before it asks you anything, and reads them fresh before each piece of work.
3. **Turn your workflows into skills.** For each piece of work a bot owns, list the workflows you repeat, like a weekly account update or a renewal note, and turn each one into a skill. A skill is the playbook you'd hand a new hire: the steps, the template, and what good looks like. Your bots share one skill library, so a fix to a skill reaches every bot that uses it.
4. **Check the work.** No one grades their own work well, so a fresh checker reviews every draft against its sources and the skill's definition of good before you see it. Anything that sends a message, changes a record, or can't be undone waits for your yes.
5. **Coordinate the team.** When a bot finishes its part, it hands the next step straight to the bot that owns it. Your manager keeps track of the work across the team: it delegates new requests, follows up on anything stuck, and briefs you on what needs you.
6. **Scale the team.** Add bots as your work grows, one at a time. Team Builder recommends a new bot when it sees one missing from your work, such as an owner for a new account or a specialist when several owners keep needing the same know-how.
7. **Adapt as your work changes.** Once a week, you and Team Builder review the team. It checks each bot, gathers feedback on skills, flags outdated memory, and brings you one list of decisions. Corrections go into skills instead of one-off fixes, so the team improves every week and changes as your work does.

You still make the calls. The bots do the reading, drafting, and follow-up.

## What's in the stack

<!-- team-builder-stack:begin counts -->
19 skills, one principles file with 10 principles, a blank team spec, and a 6-chapter guide.
<!-- team-builder-stack:end counts -->

### Team Builder

Install the plugin, then ask your primary bot to run [Set up Team Builder](./skills/set-up-team-builder/SKILL.md). It creates one bot called Team Builder in your own Grok Bot account. Team Builder interviews you about your work, writes your team spec, and builds your team one bot at a time, asking before it creates anything. It runs one weekly routine, which preps your bot review two hours before it starts. Updates reach you through the plugin.

### Design principles

Each principle has its own section in [principles.md](./skills/explain-how-it-works/references/principles.md): when it applies, the rule, what to do, and an example.

<!-- team-builder-stack:begin readme-principles -->
| Principle | The rule |
| --- | --- |
| [Context isolation and traceability](./skills/explain-how-it-works/references/principles.md#context-isolation-and-traceability) | Give each unit of work its own bot, keep it in that unit's context, and make everything it does traceable. |
| [Context cascade](./skills/explain-how-it-works/references/principles.md#context-cascade) | Connect your systems of record first and get them right, because bad data at the source spreads to everything built on it. |
| [Make no assumptions](./skills/explain-how-it-works/references/principles.md#make-no-assumptions) | Ground every bot, skill, and answer in the person's real systems and examples. Look up any fact you have access to and give its source instead of asking, bring only preferences to the person, and ask before creating anything. |
| [Just-in-time context](./skills/explain-how-it-works/references/principles.md#just-in-time-context) | Open the template and the source right before the work, so nothing runs on stale facts. |
| [Procedure and perspective](./skills/explain-how-it-works/references/principles.md#procedure-and-perspective) | Give procedural work fixed steps and templates, and use the bot as a sparring partner for creative work. |
| [Dynamic orchestration](./skills/explain-how-it-works/references/principles.md#dynamic-orchestration) | The skill sets how the work splits and its limits, and the bot writes a short plan that fits that pattern to each run. |
| [Definition of good](./skills/explain-how-it-works/references/principles.md#definition-of-good) | Say what good looks like before you build, and put every correction back into the skill. |
| [Independent verification](./skills/explain-how-it-works/references/principles.md#independent-verification) | The agent that made an output doesn't grade it. A fresh check is the default last step. |
| [Human judgment](./skills/explain-how-it-works/references/principles.md#human-judgment) | Reading and drafting run freely. Anything that sends, changes a record, or can't be undone waits for your yes, and each yes covers one action. |
| [Handoffs and delegation](./skills/explain-how-it-works/references/principles.md#handoffs-and-delegation) | The finishing bot messages the next owner directly and says what's done and what's next. |
<!-- team-builder-stack:end readme-principles -->

### Utility skills

Workflow skills call these shared steps instead of copying them, and every workflow skill's Verify step calls Verify work, so no workflow skips the check.

- **[Plan the work](./skills/plan-the-work/SKILL.md).** Sizes a run before the work splits: stages, checks, and when to stop.
- **[Delegate work](./skills/delegate-work/SKILL.md).** Sends pieces of work to fresh helpers on the same bot, or to the bot that owns them.
- **[Verify work](./skills/verify-work/SKILL.md).** A fresh checker reopens each source and tests each claim before anything is saved or shown.
- **[Triage work](./skills/triage-work/SKILL.md).** Sorts a stream of incoming items to the right skill, the bot that owns it, or you.
- **[Inform manager bot](./skills/inform-manager-bot/SKILL.md).** Tells your manager when a task finishes or gets stuck, and only interrupts it for a block, a decision, or a deadline.
- **[Run review panel](./skills/run-review-panel/SKILL.md) (optional).** For a high-stakes draft, a few fresh reviewers and a separate judge suggest changes, and you pick which to keep.

### The guide

The [Team Builder Stack guide](./skills/explain-how-it-works/references/guide/README.md) teaches all of this in short chapters, from the core idea and your first owner bot to growing the team and making it yours.

<!-- team-builder-stack:begin readme-guide -->
1. [The core idea](./skills/explain-how-it-works/references/guide/01-the-core-idea.md). Give a bot to what carries its own history, and turn each repeated workflow into a skill. (Basics)
2. [Your first owner bot](./skills/explain-how-it-works/references/guide/02-your-first-owner-bot.md). One owner bot for one unit, proved by hand, then put on a routine. (Basics)
3. [Utility and standard skills](./skills/explain-how-it-works/references/guide/03-utility-skills.md). Six utility skills every bot uses, the standard skills every skill follows, and where each one lives in the stack. (Going further)
4. [The system map](./skills/explain-how-it-works/references/guide/04-the-system-map.md). Where the tailoring lives: your systems, how they store data, and how they tie to your units. (Going further)
5. [Growing the team](./skills/explain-how-it-works/references/guide/05-growing-the-team.md). Manager, owner, and specialist bots, how they work together, and adding bots as the work grows. (Going further)
6. [Making it yours](./skills/explain-how-it-works/references/guide/06-making-it-yours.md). Teach the stack how you work, and keep your skills current. (Going further)
<!-- team-builder-stack:end readme-guide -->

## Get started

Install the Team Builder Stack from Marketplace in Grok Bot, or from your team's marketplace if your team has one. In Cursor, add it with:

```text
/add-plugin team-builder-stack
```

Then ask your primary bot to run [Set up Team Builder](./skills/set-up-team-builder/SKILL.md). If you already have Team Builder, it asks that bot to run the plugin updates in its own chat instead of making a second one.

Most requests to Team Builder land in one of three skills:

- **[Build my team](./skills/build-my-team/SKILL.md).** Learns how you work, writes your team spec, builds your first bot, and builds your team map. If you already have bots, it runs Check my bots first.
- **[Check my bots](./skills/check-my-bots/SKILL.md).** Interviews you about how you use your bots, compares them with your team spec and the principles, refreshes your team map, and proposes changes. It changes nothing without your yes.
- **[Coach my bots](./skills/coach-my-bots/SKILL.md).** Turns a correction or a change in your work into an edit to a skill, a bot type's operating guide, or your team spec.

```text
/build-my-team I look after twelve accounts.
```

```text
/coach-my-bots we moved our notes from one tool to another. what needs to change?
```

Improvements reach you through the installed plugin, so don't save copies of its skills to your skill library. A copy never updates, and a library skill with the same name takes the plugin skill's place, so your bots run the stale copy. Check my bots flags such copies and offers to rename them after your yes; removing a skill or a plugin is your call. The skills Team Builder writes for you, such as your workflow skills and your writing voice, live in your library.

## Skills

<!-- team-builder-stack:begin readme-skills -->
| Skill | Type | Slug | Description |
| --- | --- | --- | --- |
| [Set up Team Builder](./skills/set-up-team-builder/SKILL.md) | workflow | `set-up-team-builder` | Use when the person asks to set up Team Builder; creates one Team Builder bot from the plugin after a yes, or asks an existing one to run the plugin updates in its own chat. |
| [Build my team](./skills/build-my-team/SKILL.md) | workflow | `build-my-team` | Use when the person wants their team built or has no team spec; writes the team spec and map and builds the first bot, checking existing bots first. |
| [Build a bot](./skills/build-a-bot/SKILL.md) | workflow | `build-a-bot` | Use when the person needs one more owner, specialist, or manager bot; creates it from its type's operating guide with its about line, profile facts, and setup. |
| [Write a workflow skill](./skills/write-a-workflow-skill/SKILL.md) | workflow | `write-a-workflow-skill` | Use when a repeated workflow should become a skill; writes one five-step workflow skill from the person's real systems and examples, named to the standard. |
| [Coach my bots](./skills/coach-my-bots/SKILL.md) | workflow | `coach-my-bots` | Use when a bot got something wrong or the work changed; makes the smallest fix to the one skill, template, operating guide, or spec line that holds it. |
| [Check my bots](./skills/check-my-bots/SKILL.md) | workflow | `check-my-bots` | Use when the person wants their bots or setup checked; read only, compares bots with the team spec and principles, refreshes the map, and proposes fixes. |
| [Run the weekly bot review](./skills/run-the-weekly-bot-review/SKILL.md) | workflow | `run-the-weekly-bot-review` | Use when the weekly bot review is coming up or under way; checks the bots, gathers skill feedback and wins, flags outdated memory, builds one decision list, and applies what the person approves. |
| [Clean up memory](./skills/clean-up-memory/SKILL.md) | workflow | `clean-up-memory` | Use when a bot's memory may be stale or crowded, or the weekly review asks for a report; lists outdated, duplicate, and contradicted facts, applies only what was approved, and reports the counts. |
| [Retire a bot](./skills/retire-a-bot/SKILL.md) | workflow | `retire-a-bot` | Use when a bot or group chat is replaced or its unit ended; saves its history, moves lasting facts to the records, and leaves deleting to the person. |
| [Set my writing voice](./skills/set-my-writing-voice/SKILL.md) | workflow | `set-my-writing-voice` | Use when bots should sound like the person or their voice changed; writes their Writing voice standard skill from their own writing, after a yes. |
| [Save what we learned](./skills/save-what-we-learned/SKILL.md) | workflow | `save-what-we-learned` | Use when a task took too long or went wrong; proposes edits to the skills this session used, and changes nothing until the person picks them. |
| [Explain how it works](./skills/explain-how-it-works/SKILL.md) | workflow | `explain-how-it-works` | Use when the person asks why or how the Team Builder Stack works; answers in their words from the principles and guide, naming the part used. |
| [Team Builder operating guide](./skills/team-builder-operating-guide/SKILL.md) | standard | `team-builder-operating-guide` | Follow whenever you are Team Builder and start any task; your job, skills, connectors, rules, and handoffs, as the Team Builder Stack plugin ships them. |
| [Triage work](./skills/triage-work/SKILL.md) | utility | `triage-work` | Called by a skill when work arrives as a stream of items; sorts each item to a skill on this bot, the bot that owns it, or the person. |
| [Delegate work](./skills/delegate-work/SKILL.md) | utility | `delegate-work` | Called by a skill when work splits or a step belongs to another bot; runs the pieces in subagents by the plan, or sends them to the owning bot. |
| [Verify work](./skills/verify-work/SKILL.md) | utility | `verify-work` | Called by every Verify step before anything is saved or shown; a fresh checker reopens each source and checks each claim against the standard. |
| [Plan the work](./skills/plan-the-work/SKILL.md) | utility | `plan-the-work` | Called by Do the work when work splits or outgrows the skill's pattern; writes a plan sized to the work: stages, worker contracts, checks, and stop rules. |
| [Inform manager bot](./skills/inform-manager-bot/SKILL.md) | utility | `inform-manager-bot` | Called by Hand off when a task finishes or is blocked; marks it done and sends the manager bot a linked note, waking it only for a block, decision, or deadline. |
| [Run review panel](./skills/run-review-panel/SKILL.md) | utility | `run-review-panel` | Called by a skill after Verify work when a high-stakes draft needs review; fresh reviewers and a separate judge advise, and the person picks the changes. |
<!-- team-builder-stack:end readme-skills -->

### Three types of skill

Every skill states its type on the line under its name, and its name and description follow that type. Team Builder names every skill it writes for you the same way.

<!-- team-builder-stack:begin skill-types -->
- **Workflow skill.** Does one job end to end. Name: a verb plus the thing, such as Draft renewal note or Triage inbox. Description: one sentence that starts with “Use when” and the trigger, within its first 60 characters, then says what you get.
- **Standard skill.** A rule other skills follow, such as the writing voice or a company’s compliance or brand guideline. Name: the guideline’s own name, in the company’s words, such as Writing voice, Compliance guidelines, or Brand voice, with no added suffix. Description: one sentence that starts with “Follow whenever” and what it covers, within its first 60 characters, then says where its source lives.
- **Utility skill.** A step that workflow skills call. Name: an explicit verb, plus the thing when the verb alone doesn’t say exactly what it does, such as Delegate work or Verify work. Description: one sentence that starts with “Called by” and the step that calls it, within its first 60 characters, then says what it checks or does.
<!-- team-builder-stack:end skill-types -->

## The team spec

[Build my team](./skills/build-my-team/SKILL.md) writes one team spec with you, at `/workspace/team-builder-stack/team-spec.md` on the computer your bots share. It's the one source of truth for how your team is put together, and every skill reads it. It starts from the [blank team spec](./skills/build-my-team/references/team-spec-template.md) and holds only what Grok Bot doesn't already keep: never passwords, keys, customer data, or facts about one account. You see it as the team map, built with the [team map template](./skills/build-my-team/references/team-map/README.md), and Team Builder rebuilds the map from the spec after each change.

## Planned for a later version

- **Change cleanup.** After a big change, find what still points at the old way and fix it.

## Credits

The stack is modeled on pstack by Lauren Tan, which is also MIT licensed.

## License

MIT
