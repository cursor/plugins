# The principles

Read this file in full before the first step of any skill that builds, checks, or changes a bot. Each section says when it applies, the rule, what to do, and an example.

## Contents

- [Context isolation and traceability](#context-isolation-and-traceability). Apply when deciding whether something gets its own bot, or a skill reads or writes data for more than one unit, or takes an action or states a fact someone may need to trace later.
- [Context cascade](#context-cascade). Apply when setting up a bot’s connectors, choosing the system of record for a workflow, or two sources disagree.
- [Make no assumptions](#make-no-assumptions). Apply when creating a skill, a template, a bot, or a setting, stating a fact a person will rely on, or about to ask the person or another bot anything.
- [Just-in-time context](#just-in-time-context). Apply when writing any workflow skill, or a step that drafts from facts that may have changed.
- [Procedure and perspective](#procedure-and-perspective). Apply when deciding whether a workflow gets fixed steps and a template, or the bot works as a sparring partner.
- [Dynamic orchestration](#dynamic-orchestration). Apply when a skill spins up subagents, a run is bigger than its skill’s pattern, or the same task runs on many units, many sources, or many points of view.
- [Definition of good](#definition-of-good). Apply when writing a workflow’s template, or a person corrects a bot’s work.
- [Independent verification](#independent-verification). Apply when a skill produces anything that will be written down or shown to a person.
- [Human judgment](#human-judgment). Apply when a step sends, changes a record, or can’t be undone, a decision belongs to the person, a manager bot gathers what’s waiting, or a task is marked done.
- [Handoffs and delegation](#handoffs-and-delegation). Apply when work crosses from one bot to another.

## Context isolation and traceability

Apply when deciding whether something gets its own bot, or a skill reads or writes data for more than one unit, or takes an action or states a fact someone may need to trace later.

**Rule.** Give each unit of work its own bot, keep it in that unit’s context, and make everything it does traceable.

**What to do.**

- **Operating guide.** The bot’s type has one operating guide, and the bot’s own unit and record come from the team spec.
- **Memory.** Each bot has its own memory, conversation, and working state, so a separate bot for each account is the boundary.
- **Group chats.** A group chat is not a boundary, because a bot’s own memory shows up in every group it joins.
- **Connectors.** Connectors reach every account, so each skill reads one account’s records by its ID.
- **Skills.** Research, writing, and checking are skills the bot runs, not bots of their own. Each workflow skill’s record step adds a line to the unit’s log.
- **Records and audit.** Routines keep their run history, and Enterprise adds audit logs and action recording.

**Example.** Each account has its own bot, named for it: Account A and Account B. Account A researches account A and writes to account A’s page, and each skill fetches records by account ID, so nothing learned on A reaches B. Research is not a bot. It’s a skill both bots run. Every change to account A’s page adds a line to account A’s log, so next week’s run, and you, can see what changed and why.

### When something gets its own bot

- **It carries its own history.** Its past makes the next piece of work better.
- **It lasts.** It runs about a month or longer.
- **You’d lose something if it were rebuilt from the record alone.** It holds judgment that isn’t written down anywhere.
- **Scope of work.** Size the unit to the person’s scope of work. A handful of strategic accounts each get their own bot. With 150 renewals, the renewal book is the unit, one owner bot owns it, and each renewal is an item it works through.

Otherwise it’s a skill or an item. Short tasks, one-off requests, and items in a queue run as skills on an existing bot. A topic whose know-how every unit uses, like product knowledge, is the exception. It gets a specialist bot.

## Context cascade

Apply when setting up a bot’s connectors, choosing the system of record for a workflow, or two sources disagree.

**Rule.** Connect your systems of record first and get them right, because bad data at the source spreads to everything built on it.

**What to do.**

- **Connectors.** Each connector is set up and checked with a read-only lookup before any skill depends on it.
- **Skills.** The first workflow writes the signals to the account’s record, such as the account page, and later skills start from that page. When two sources disagree, the system of record wins.
- **Memory.** A bot’s memory is a working cache. Any bot can be rebuilt from the record.

**Example.** Before Account A runs its first skill, the CRM and call connectors are set up and checked. The bot gathers the CRM, the calls, and the email once and writes account A’s page. The account plan, the QBR deck, and the manager bot’s daily brief all start from that page, so a wrong renewal date in the CRM would show up in all three. Fix it in the CRM once, and all three come out right.

## Make no assumptions

Apply when creating a skill, a template, a bot, or a setting, stating a fact a person will rely on, or about to ask the person or another bot anything.

**Rule.** Ground every bot, skill, and answer in the person’s real systems and examples. Look up any fact you have access to and give its source instead of asking, bring only preferences to the person, and ask before creating anything.

**What to do.**

- **Connectors.** Before it writes a skill, a template, an operating guide, or a setting, the bot looks up real records through the person’s connectors, read only.
- **Facts and preferences.** A question the person’s systems can answer, such as a date, an owner, or which field holds a value, is a fact: the bot looks it up and answers with its source. Only a question of taste or judgment, such as tone, priority, or which of two good options to take, goes to the person, as a short choice.
- **No going ahead on a guess.** When a fact can’t be found, the bot says where it looked and what’s missing. It never offers to go ahead anyway on a fact it could check.
- **The next questions.** Before it shows the work, the bot answers the questions the reader is likely to ask next, such as when, who owns it, and what it depends on, each with its source.
- **Asking another bot.** When a fact belongs to another bot, the bot sends the question with Delegate work, finishes its turn with the work minus that item, marked as waiting, and fills it in when the answer arrives as a later message. Messages between bots don’t wait for a reply, so it never holds the turn open.
- **Skills.** It reads real examples of the person’s work and builds each template from them. Every fact it writes carries a link, and claims about people and meetings get checked against the calendar, notes, and email.
- **Subagents.** A subagent for each source returns every fact with a link to where it came from.
- **Connectors and examples.** A bot never assumes it can work without its connectors or real examples, and asks for them instead.
- **Before it asks.** The bot checks every source it can reach before asking the person or another bot anything. A question it could have answered itself is a miss.

**Example.** Before it writes Account A’s research skill, the bot opens Account A in the CRM and reads the last three account updates the person wrote. It finds which field holds the renewal date instead of asking. It asks only whether the person wants risks first or wins first. The pricing question belongs to the product specialist, so the bot sends it, shows the draft with that line marked as waiting, and fills it in when the answer comes back.

## Just-in-time context

Apply when writing any workflow skill, or a step that drafts from facts that may have changed.

**Rule.** Open the template and the source right before the work, so nothing runs on stale facts.

**What to do.**

- **Skills.** Each workflow skill opens its template in the load step, right before it drafts, from the skill or from its link, so edits made where the template lives are picked up.
- **Connectors.** The load step reopens the current source, and the verify step reopens it again.
- **Memory.** When memory and the source disagree, the source wins.
- **Every pass.** A bot reads the skill at its path at the start of every pass, including a rework or a resumed worker, and a worker’s brief names that path instead of copying the steps.

**Example.** Before Account B drafts the renewal note, its load step opens the renewal note template and reopens the CRM. The bot remembered March, but the CRM says April, so the note says April. The verify step reopens the CRM and confirms April before anything is saved.

## Procedure and perspective

Apply when deciding whether a workflow gets fixed steps and a template, or the bot works as a sparring partner.

**Rule.** Give procedural work fixed steps and templates, and use the bot as a sparring partner for creative work.

**What to do.**

- **Skills.** Procedural work runs as a fixed skill with a template, so every run follows the same steps and produces the same shape.
- **Subagents.** For creative work, subagents take different points of view, such as the CFO or an end user, and push back on a draft.
- **Operating guide.** The operating guide says which workflows follow a fixed procedure and where the bot should push back and offer ideas instead.
- **Subagents.** For a high-stakes draft, a review panel gives several points of view at once: reviewers advise, a separate judge merges what they say, the person picks the changes, and it never replaces verification.

**Example.** Account A’s weekly update is procedural: the same steps and the same template every Monday. Account A’s account plan is creative: the bot argues the other side, suggests three angles you hadn’t tried, and leaves the plan to you.

## Dynamic orchestration

Apply when a skill spins up subagents, a run is bigger than its skill’s pattern, or the same task runs on many units, many sources, or many points of view.

**Rule.** The skill sets how the work splits and its limits, and the bot writes a short plan that fits that pattern to each run.

**What to do.**

- **Skills.** The skill names the default pattern: the pieces, which run side by side and which wait on others, what each one gets and the shape it returns, and how the results combine. It also names its limits, such as how many pieces at once.
- **Plans.** When the work splits, or is bigger than the pattern covers, the bot runs Plan the work first. A small job gets a one-line plan. A big job, or one no skill covers, gets a full plan in the bot’s to-do list. A plan that needs more than four subagents at once, changes code, or costs a lot is shown to the person first.
- **Worker contracts.** For each stage, the plan writes one contract that every subagent in that stage shares: the same brief, only its own piece, the exact fields to return, one file per piece in the run folder, and a done test. The results then combine by those fields, and Verify work checks each one against the same contract.
- **Subagents.** Fresh subagents run side by side, one for each unit, source, or point of view, each handed only its own material. They can’t start subagents of their own, so the bot runs every stage itself.
- **Routines.** A routine starts the skill. In a scheduled run with nobody around, the bot stays inside the skill’s pattern and limits.
- **Direct messages.** Work that another bot owns goes to that bot by direct message, not to a subagent.

**Example.** Account A’s research skill reads the CRM, the calls, and the email side by side, one subagent each. This Monday there are also 12 new tickets, so the plan adds a stage: four subagents at a time, three tickets each, every one returning the same fields to its own file. The bot combines the files, runs one Verify work check per source, and logs that this run departed from the skill’s pattern and why.

## Definition of good

Apply when writing a workflow’s template, or a person corrects a bot’s work.

**Rule.** Say what good looks like before you build, and put every correction back into the skill.

**What to do.**

- **Skills.** Each workflow skill has a template, in the skill or linked from it, and a short description of what good looks like, and its verify step checks the draft against both.
- **Skills.** All of a person’s bots share one skill library, so a fix to a skill or its template reaches every bot that runs it.
- **Skills.** Each skill lives in one place. A library skill with a plugin skill’s name takes its place: the plugin’s version drops out of the skill list, and bots run the copy, which never updates. Bots point out such copies, and plugins nobody uses, and never remove either. That’s the person’s call.
- **Memory.** The bot’s memory holds what it has learned about its unit, not the steps of the work, so a correction that should last goes into the skill.
- **Where rules live.** A bot’s description is a one-line about. Its rules are in its type’s operating guide, which a profile fact points to by path.

**Example.** Account A’s update template says what a good update holds: the renewal date, what changed since last week, and the one decision the person needs to make, each fact with its link. When you tell Account A that an update buried the decision, the fix goes into the template, so Account B leads with the decision next Monday too.

**In the Team Builder Stack.** Write a workflow skill writes each template and what good looks like with the person. Coach my bots and Save what we learned turn a correction into an edit to the skill or its template, and Explain how it works explains why a standard is what it is.

## Independent verification

Apply when a skill produces anything that will be written down or shown to a person.

**Rule.** The agent that made an output doesn’t grade it. A fresh check is the default last step.

**What to do.**

- **Subagents.** A fresh subagent, started with a new conversation, reopens each source and checks each claim.
- **Skills.** The check is the verify step of every workflow skill. It checks the draft against the template and what good looks like, and the record step waits for it.

**Example.** Account A drafts the update and starts the check. The check finds that five of five facts match their sources and that the update leads with the decision, as the template asks, and only then does the bot write account A’s page.

## Human judgment

Apply when a step sends, changes a record, or can’t be undone, a decision belongs to the person, a manager bot gathers what’s waiting, or a task is marked done.

**Rule.** Reading and drafting run freely. Anything that sends, changes a record, or can't be undone waits for your yes, and each yes covers one action.

**What to do.**

- **The usual list.** Safety default from day one: bots read the apps and draft anything. They ask first before they send anything outside the company, post where customers can see, change a record in a system, delete anything, or spend money. These stay with a person: sign a contract, change pricing, or publish to customers.
- **Auto Review.** Auto Review holds anything that sends, changes a record, or can’t be undone, and the yes can only be given in the bot’s own chat with its owner.
- **Group chats.** In a group, a personal bot’s gated action is refused, not saved for later.
- **Skills.** Each workflow skill names the decision that stays with the person before it names anything the bot does.
- **Manager bots.** A manager bot can gather what’s waiting into one brief, so the person has one place to see it, but each yes happens in the chat of the bot doing the action. The manager bot never approves for anyone.
- **Marking a task done.** The one exception to the usual list: a bot marks a task done in the task list without a yes when the person says in chat that it’s done, or when a run finds it finished. Every task closed without the person’s word is listed in their next brief.

**Example.** Account B reads the CRM and drafts the renewal email freely. Updating the CRM and sending the email each wait for your yes in the bot’s own chat. The pricing call and the renewal strategy stay with you. When the overnight run finds the renewal note already signed, it marks that task done on its own, and your morning brief lists it.

## Handoffs and delegation

Apply when work crosses from one bot to another.

**Rule.** The finishing bot messages the next owner directly and says what’s done and what’s next.

**What to do.**

- **Direct messages.** Bots message each other directly. In a group with people in it only people wake bots, so an @mention there doesn’t start the next bot.
- **Operating guides.** A manager bot’s operating guide says it routes the work and doesn’t do the owners’ work. Each bot’s operating guide says, under Handoffs, who it tells, and when.
- **Informing.** When an owner bot finishes a task, it marks the task done and tells the manager bot with Inform manager bot, without waking it. A block, a decision, or a deadline at risk wakes it.

**Example.** When Account A needs to know what can be offered, it messages the product specialist directly with the question and the account’s context. When you ask the manager bot for account B’s QBR prep, it sends the request to Account B and moves on.
