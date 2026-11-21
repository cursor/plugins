# 5. Growing the team

Your bots are your team: a manager bot, owner bots, and specialist bots, plus Team Builder, which builds, checks, and coaches them, all working from the same playbook of skills. Each type has one role, written into its operating guide, that says who does the work, who answers for it, who is asked, and who is kept informed.

- **Owner bot: owns one unit of work end to end.** The unit is an account, a project, or a book of work such as a renewal book. The owner keeps that unit’s memory and does the day-to-day work through skills. It is responsible for its unit. Like the person who runs one account day to day.
- **Manager bot: keeps the team moving.** It takes requests that don’t belong to one bot, delegates them, follows up on anything stuck, and briefs the person. It doesn’t do the owners’ work. It answers for the work across units and is always kept informed. Like a regional director.
- **Specialist bot: owns a topic every unit uses.** The topic is something like product knowledge or the operating model. Owner bots consult it, and it owns no outcomes. Like customer education or go-to-market operations.

One person usually has several owner bots, so think of your bots as your team, not of each bot as one teammate.

You can talk to any bot directly. Go to an owner about its unit, a specialist for its topic, and the manager when you’re not sure who should take something or it spans several bots.

Your manager bot is most likely your primary bot, the one pinned at the top that you go to first. Most people start there, often naming it something like a Chief of Staff. You may run more than one manager bot later. Until then, assume one, and make it your primary bot.

## How a team grows

1. **The primary bot as the manager bot.** Most people already have one, and it keeps the team moving.
2. **One owner bot for one unit.** It has a few skills.
3. **More owner bots.** Add them from the first one, then improve them from your feedback.
4. **A specialist bot.** Add one when several owners keep needing the same know-how.

Team Builder recommends the next bot when it sees one missing.

## Who tells whom

| Bot | Tells | When, and how |
| --- | --- | --- |
| Owner bot | The manager bot | A task finished, the person changes one in chat, or a check the manager bot asked for ends: the task list is updated, then the owner bot sends a note with Inform manager bot. Blocked, a decision needed, a deadline at risk, or a change to today’s brief: a note the manager bot acts on now. |
| Owner bot | The owner of the next step | The next step is another bot’s: a handoff with Delegate work. |
| Owner bot | A specialist bot | It needs that topic’s know-how: a question with Delegate work. |
| Specialist bot | The bot that asked | Answers with sources. The bot that asked tells the manager bot. |
| Manager bot | An owner bot | A new request for that unit: Triage work, then Delegate work. |
| Manager bot | An owner bot | A note says it’s blocked or a deadline is at risk, or delegated work is overdue: a follow-up with Delegate work. Anything only you can unblock goes in the brief. |
| Manager bot | You | The daily brief, with only what needs a decision. Work you sent out through it: when it comes back. |
| You | Any bot | Ask it directly about its unit or topic. It answers in that chat. |
| You | The bot doing the action | Each yes, in that bot’s own chat. |

Notes keep your manager bot current, so it has the latest when you go to it. It doesn’t reply to you about them. Its daily brief reads the task list and each unit’s record, not the notes, and lists every task closed without your word. When a note says a change makes today’s brief out of date, it corrects those lines in place and sends you nothing. The task list stays the record.

## Working as a team

- **Handoffs and delegation.** The finishing bot messages the next owner directly and says what’s done and what’s next.
- **One place to see what’s waiting.** A manager bot gathers what’s waiting into one brief, but each yes happens in the bot doing the action, as [Human judgment](../../../explain-how-it-works/references/principles.md#human-judgment) says. The manager bot doesn’t approve for anyone.

## Where group chats fit

Group chats use more of your usage, because every bot reply counts, so keep ordinary work with one bot.

- **When a group helps.** Use one when you want several bots’ answers side by side, or for a push across several units that no single bot owns, such as a two-week effort across five accounts. The bots answer in the group. Type @ and a bot’s name to send a request to one bot. Fewer bots in a group means fewer replies.
- **Approvals and handoffs.** Ask for approvals in the bot's own chat, not in a group chat. A bot’s message to another bot shows up in that bot’s own chat, not in the group, so handoffs happen there.

## The industry’s names

| Industry term | In Team Builder Stack |
| --- | --- |
| Supervisor and orchestrator | The manager bot |
| The workers in orchestrator-workers | Owner bots |
| Evaluator-optimizer | Verification |
| Routing | Triage work |
| Parallelization | Parallelization |
| Planner and workers | Plan the work, then Delegate work |
| Prompt chaining | How any skill is written |
| Human-in-the-loop | Human judgment |
| Handoffs | Handoffs |

Maintenance isn’t a utility skill. Health checks on skills and routines, cleanup after a big change, and spot-checks of bot output belong to Team Builder, because it knows how the team was built. A rule change for every bot of a type goes in that type’s operating guide, through Coach my bots.

## In the Team Builder Stack

Ask Team Builder to add a bot for another unit, a specialist bot, or a manager bot. Team Builder recommends a missing bot in the weekly review, and builds it with [Build a bot](../../../build-a-bot/SKILL.md) on a yes. When the manager is the person’s existing primary bot, Build a bot sets it up rather than creating a new bot. Build a bot builds the new bot from its bot blueprint, so every bot of one kind follows the same operating guide and skills, and is named by its unit only. Every bot, including a manager bot and Team Builder, follows an operating guide with the same five sections and shared rules; only its job, skills, connectors, its own rules, and its handoffs differ by type, and its unit comes from your team spec. Once you have a manager bot, its morning kickoff writes each owner bot's ask to a dated file and names the owner bot that reads it. Owner bots keep no routines of their own unless you ask for one. To replace or retire a bot or a group chat, it runs [Retire a bot](../../../retire-a-bot/SKILL.md).

Next: [Making it yours](06-making-it-yours.md).
