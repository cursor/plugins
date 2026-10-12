# 2. Your first owner bot

One owner bot for one unit. It has a few skills. Most people stop here.

Start by connecting the bot to the systems of record it will work from. In Grok Bot, a bot and its connectors come before its skills, so set up and check each connector before any skill depends on it. Then get the source right: bad data quality or structure at the source compounds through every deliverable built on it. Gather the signals once, write them to a record people can see, like the account page, and start later work from it. When two sources disagree, the system of record wins. A bot’s memory is a working cache, so any bot can be rebuilt from the record.

## What the first bot is made of

- **Operating guide and about line.** The bot’s type has one operating guide, a skill with its job, skills, connectors, rules, and handoffs, which the bot reads at the start of every task. Its description is a one-line about that other bots read. Three short profile facts, always in its memory, point it to the guide.
- **A workflow skill.** One skill for the workflow. A workflow skill builds the utility skills into its steps. Account research, for example, loads context, researches in parallel subagents, verifies, and then keeps the record. In the Team Builder Stack every workflow skill runs the same five steps, load, do the work, verify, record, and hand off, and keeps a template for what it produces. Your own steps sit inside do the work.
- **A routine.** Tells one bot when to run a workflow, on a schedule or, where supported, after an event. It holds the specifics, such as which account.

## Personal bots and team bots

- **A personal bot.** It fits one person’s unit. Its memory is private to its owner.
- **A team bot.** It fits a unit a whole team shares. Its main memory is visible to every teammate who talks to it, and its notes about each person follow that person across their chats with it. It can also keep up to 250 skills of its own, which no other bot sees.

Don’t use a team bot as the home for one person’s confidential unit.

## What waits for your yes

Safety default from day one: bots read the apps and draft anything. They ask first before they send anything outside the company, post where customers can see, change a record in a system, delete anything, or spend money.

Anything that sends, changes a record, or can’t be undone waits for a person’s yes. The product collects that yes only in a bot’s own chat with its owner. It refuses a gated action in a group chat. Each yes covers one action.

## In the Team Builder Stack

Ask Team Builder to build your team. It runs [Build my team](../../../build-my-team/SKILL.md), which writes your team spec, learns how you work, lists the steps, and asks before it creates anything. Its skills come from the Team Builder Stack plugin you install, so improvements reach you through the plugin.

If you don’t have Team Builder yet, your primary bot runs [Set up Team Builder](../../../set-up-team-builder/SKILL.md). It shows the about line, profile facts, and the one routine the plugin carries, and on your yes creates one bot named Team Builder. That bot creates Weekly review prep in its own chat, two hours before the weekly bot review. If Team Builder already exists, it asks that bot to run the plugin updates from the weekly review, in its own chat.

Next: [Utility and standard skills](03-utility-skills.md).
