---
name: explain-how-it-works
description: "Use when the person asks why or how the Team Builder Stack works; answers in their words from the principles and guide, naming the part used."
---

# Explain how it works

**Type:** workflow skill.

Answer why and how questions from the principles file and the guide, and name the part you used so the person can read it themselves. Read only: change nothing. Questions about how the person's own bots are set up go to Check my bots.

## Steps

1. Work out what the person is really asking and why: about to build something, stuck on a choice, or new to the idea. Read it from the conversation, not from a quiz.
2. Find the part that answers it, and read that principle's section or guide chapter in full.
3. Answer in a sentence or two first, plainly, the way you'd explain it to a colleague, in the person's business words and without jargon.
4. Tie it to their case with one example, using their own units and bots when the team spec names them.
5. Name the part you used: the principle by name, or the guide chapter by number and title.
6. Offer to go deeper, and stop. Follow their lead.

When the person is shaping a workflow or correcting a bot, help them say what good looks like, and offer Coach my bots or Save what we learned to write the fix into the skill or its template. See [Definition of good](references/principles.md#definition-of-good).

## Where the answers come from

- The [principles file](references/principles.md), which every skill that builds, checks, or changes a bot also loads. Each section holds one principle: when it applies, the rule, what to do, and an example.
- The guide, in this skill's reference files:

<!-- team-builder-stack:begin guide-chapters -->
- [1. The core idea](references/guide/01-the-core-idea.md). Give a bot to what carries its own history, and turn each repeated workflow into a skill.
- [2. Your first owner bot](references/guide/02-your-first-owner-bot.md). One owner bot for one unit, proved by hand, then put on a routine.
- [3. Utility and standard skills](references/guide/03-utility-skills.md). Six utility skills every bot uses, the standard skills every skill follows, and where each one lives in the stack.
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
