---
name: explain-how-it-works
description: "Use when the person asks why or how this stack works; answers from the principles and the guide."
---

# Explain how it works

**Type:** workflow skill.

Answer why and how questions from the principles file and the guide, and name the part you used so the person can read it themselves. Read only: change nothing. Questions about how the person's own bots are set up go to Check my bots.

## Steps

1. Work out what the person is really asking and why: about to build something, stuck on a choice, or new to the idea. Read it from the conversation, not from a quiz.
   Does: Work out what the person is really asking, from the conversation.
   Pulls from: the conversation
   Uses: none, this step only reads the conversation
   Produces: the question, in their words
   Hands to: the next step, and it does not wait
   Needs your review: none, you read the question, you do not quiz them
2. Find the part that answers it, and read that principle's section or guide chapter in full.
   Does: Find the principle or guide chapter that answers it, and read that part in full.
   Pulls from: the principles file or the guide chapter
   Uses: none, this step only reads files
   Produces: the part that answers the question
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only reads
3. Answer in a sentence or two first, plainly, the way you'd explain it to a colleague, in the person's business words and without jargon.
   Does: Answer in a sentence or two, in the person's business words.
   Pulls from: the part you just read
   Uses: none, this step only answers
   Produces: the short answer
   Hands to: the next step, and it does not wait
   Needs your review: none, the answer is the reply
4. Tie it to their case with one example, using their own units and bots when the team spec names them.
   Does: Tie the answer to their case with one example.
   Pulls from: the team spec, when it names their units and bots
   Uses: none, this step only reads files
   Produces: one example from their case
   Hands to: the next step, and it does not wait
   Needs your review: none, the example is part of the answer
5. Name the part you used: the principle by name, or the guide chapter by number and title.
   Does: Name the principle or the guide chapter you used.
   Pulls from: that principle or chapter
   Uses: none, this step only reads files
   Produces: the name of the part
   Hands to: the next step, and it does not wait
   Needs your review: none, this step only names the source
6. Offer to go deeper, and stop. Follow their lead.
   Does: Offer to go deeper, and stop.
   Pulls from: their lead
   Uses: none, this step only offers
   Produces: the offer to stop or continue
   Hands to: the person, and it waits if they want to go deeper
   Needs your review: whether to go deeper

When the person is shaping a workflow or correcting a bot, help them say what good looks like, and offer Coach my bots or Save what we learned to write the fix into the skill or its template. See [Definition of good](references/principles.md#definition-of-good).

## Where the answers come from

- The [principles file](references/principles.md), which every skill that builds, checks, or changes a bot also loads. Each section holds one principle: when it applies, the rule, what to do, and an example.
- The guide, in this skill's reference files:

<!-- team-builder-stack:begin guide-chapters -->
- The [guide index](references/guide/README.md) names the six chapters.
- [1. The core idea](references/guide/01-the-core-idea.md). Give a bot to what carries its own history, and turn each repeated workflow into a skill.
- [2. Your first owner bot](references/guide/02-your-first-owner-bot.md). One owner bot for one unit, proved by hand, then put on a routine.
- [3. Utility and standard skills](references/guide/03-utility-skills.md). Seven utility skills every bot uses, the standard skills every skill follows, and where each one lives in the stack.
- [4. The system map](references/guide/04-the-system-map.md). Where the tailoring lives: your systems, how they store data, and how they tie to your units.
- [5. Growing the team](references/guide/05-growing-the-team.md). Manager, owner, and specialist bots, how they work together, and adding bots as the work grows.
- [6. Making it yours](references/guide/06-making-it-yours.md). Teach the stack how you work, and keep your skills current.
<!-- team-builder-stack:end guide-chapters -->

If neither holds the answer, say so. Don't fill the gap with a guess.

## Never

- Lecture, quiz, or ask the person to repeat it back.
- Quote the principles or the guide at length when a sentence will do.

## Team spec

<!-- team-builder-stack:begin spec role,team -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
<!-- team-builder-stack:end spec -->

## Example

The person asks: "Why can't one bot handle all my accounts?"

> Because a bot's advantage is memory, and each account has its own. One bot for all twelve would mix what it learns on one account into another, and nothing in a shared memory keeps them apart. So Account A gets its own bot, and research is a skill every account bot runs.
>
> From the principle Context isolation and traceability, and chapter 1 of the guide, The core idea. Want the part about when something should be a skill instead?
