---
name: check-my-bots
description: "Use when the person wants their bots or setup checked; read only, compares bots with the team spec and principles, refreshes the map, and proposes fixes."
---

# Check my bots

**Type:** workflow skill.

Read only. Create, save, schedule, send, delete, and change nothing without the person's yes. The only things it writes, each after a yes, are the team spec when there isn't one yet and the team map built from it. When you can't see something, ask the person to show you. Never guess.

This is discovery, not only an audit: learn how the person really uses their bots, then recommend changes from that and the principles.

## Steps

1. Read the team spec and the [principles file](../explain-how-it-works/references/principles.md) in full.
2. Interview them. Ask what they use each bot for, what works, what they work around or redo by hand, and what they wish it did. Ask about one real, recent piece of work, not the usual case. Ask which workflows touch sensitive data, and check those first. Say what you'll look at: all their bots, or only the ones a question is about. Ask before you message any bot, because a message wakes it.
3. List what exists, from the spec and for yourself: each bot's about line, profile facts, operating guide, and routines, with each schedule's time zone; the skills in their library; each connector, with one read-only lookup on a real record; and recent routine runs, as the person shows them. Mark what you couldn't see, and don't fill it in.
4. **Check it against the spec.**
   - **Copies of skills.** A library skill with a Team Builder skill's name takes the installed plugin skill's place, so bots run the copy and miss every plugin update. It may be the person's own skill, so never offer to remove it: offer to rename it. Also list installed plugins whose skills no operating guide names, and say when the library is large enough that its skills may be cut from the skill list. Never delete a skill or uninstall a plugin; removing either is the person's call. A live skill copy in a working folder, such as under `/workspace`, is a second source of truth; one dated backup kept before an edit is fine. Propose removing each live copy.
   - **Bots of one type follow one guide.** Every bot of a type follows the same operating guide and has the same skills. Only its unit differs, from the team spec, and it is named by its unit only. Flag drift, and any fact about one unit in a shared skill or guide.
   - **The spec matches what's set up:** each blueprint and its bot template link, each bot's unit, each handoff, Who verifies, and each workflow's skill. The team map was built from the current spec. No fact is kept in two places.
   - **About line.** Each bot's description is one first-person line under 120 characters, with no rules in it. When a description still holds a bot's rules, as bots built before 0.12.0 do, offer to move them into the type's operating guide, have the bot save its profile facts, and set the about line, each after a yes, with Build a bot's steps.
   - **Operating guide.** Each bot type has one operating guide, saved as a skill. It follows [every bot's operating guide](../build-a-bot/references/operating-guide.md):
     - exactly five sections, in order: Job, Skills, Connectors, Rules, Handoffs;
     - the shared rules, word for word;
     - the who-tells-whom line for its type.

     It names every skill the type runs. Rules about what waits for a yes are in the operating guide, and may also be in profile fact 2. With a manager bot, ask whether it's the person's primary bot; it most likely should be.
   - **Profile facts.** Each bot has its three profile facts, each under 500 characters. Fact 1 names the unit, where there is one, and the manager bot. One fact names the operating guide skill and its path, and that path opens. For Team Builder, compare the about line and the three profile facts with [Team Builder's profile](../set-up-team-builder/references/team-builder/profile.md), and compare its routines with that profile and the routine file in the plugin. This comparison runs in the bot's own chat. Weekly review prep can't see them from the routine run; it compares them in this chat. Where you can't read a bot's memory, list that bot as not confirmed and ask the person to have it confirm, in a chat run. Never message bots from a routine run.
   - **Memory flags.** From each bot's Clean up memory report: profile facts over 20, a "not shown" line, and a setup fact out of view.
   - **The task list.** Records and logs names the task list. Each owner bot's workflow skills end by marking finished tasks done and running Inform manager bot when there's a manager bot. The manager bot's daily brief reads the task list and each unit's record.
   - **Routines** use the home time zone from Your role. With a manager bot, owner bots run from its morning kickoff and keep no routines of their own unless the person agreed. Flag the rest. Flag a routine whose prompt carries steps instead of naming one skill.
   - **Each workflow skill** says how far back it reads, holds no specifics such as which account, and keeps its template in one place that opens. Logs record what was agreed, and sensitive details stay out of memory, the spec, and bots shared with a team.
5. **Check it against the principles.** For each live bot, skill, and routine, check each principle in the principles file as far as it fits the case. For example: does every workflow skill's Verify step run Verify work, does each skill's name and description fit its type as [Naming a skill](../write-a-workflow-skill/references/workflow-skill.md#naming-a-skill) says, does anything that sends or changes a record wait for a yes, do handoffs message the next owner directly, does one shared skill hold each guideline, and does a bot know nothing about another bot's unit, asked after the person agrees. Write each finding for the person in plain business words, with no principle names or technical terms. Name the principle only if they ask why.
6. For a question about their own setup, answer it from what you found, and say plainly what you couldn't see.
7. Run [Verify work](../verify-work/SKILL.md) with your findings and what you looked at, and wait for its result. It checks each finding against what you saw, and drops any that rest on a guess.
8. Show one list: each finding, the plain reason it matters given how this person works, the change you'd propose, and what would make it: Coach my bots, Build a bot, Retire a bot, renaming a skill, or removing a live working-folder copy, after a yes. Missing bots feeds Build a bot. For a change to the team, write the proposed spec beside the current one and show it on the team map, built with the [team map template](../build-my-team/references/team-map/README.md), current versus proposed. Summarize every change in one plain line each, and ask; the yes covers exactly what's listed.
9. Build or refresh the team map from the spec with the same template. If there's no spec yet, draft it from what you found, show it on the map as a proposal, and save it after a yes. Save the map's canvas id, or its document link when canvases aren't available, under Records and logs after a yes. Then stop.

## Spot check

A pass that finds drift before the person does. The person can ask for one any time, and Run the weekly bot review runs it during prep. It proposes fixes and applies none.

1. Pick a sample: the three most recent outputs from each bot, found in each unit's record and log.
2. Start one fresh subagent for each bot's sample, and wait for them all. Each one reopens the record and the sources and checks every fact, whether the skill's steps were followed, and whether the output fits its template.
3. During weekly review prep, run this spot check in Team Builder's chat turn, not in a routine run. A routine only wakes its own bot's chat. The findings stay in that chat turn.
4. List the drift: facts that no longer match the record, skipped steps, output that no longer fits its template, and anything a bot knows about another unit. Name the workflow skill step each one points to, and propose one fix for each in your own chat. Note a skill that is mostly bans, as a candidate for Coach my bots. Read only.

## Missing bots

Read only. It proposes and creates nothing. The person can ask for it any time, and Run the weekly bot review runs it during prep.

Read Your role (the unit of work, and how many they carry), Your team, Systems of record, the week's skill notes, each unit's log, and the task list. Do one read-only lookup in the system of record that lists the person's units. Then propose only what the evidence supports:

- An owner bot for a unit in the person's scope that no bot owns, and that passes the test in [Context isolation and traceability](../explain-how-it-works/references/principles.md#context-isolation-and-traceability), built from that kind's blueprint.
- A specialist bot when two or more owner bots keep needing the same know-how (the same topic in skill notes, handoff questions, or questions the person answered by hand, across more than one week). When the topic is a fixed reference, propose a standard skill instead, as [Build a bot](../build-a-bot/SKILL.md) step 7 says.
- Setting up the primary bot as the manager bot when requests keep spanning several bots and there is no manager bot.
- One owner bot for a book of work instead of one bot per item, when the units are too many and too small for the person's scope.

Each proposal names its evidence with links, why it fits how this person works, and that [Build a bot](../build-a-bot/SKILL.md) makes it after a yes, one bot at a time. Run [Verify work](../verify-work/SKILL.md) on the proposals before they're shown.

## Team spec

<!-- team-builder-stack:begin spec role,team,workflows,systems,records -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Your workflows.** If missing: Check the person’s skill library for what is already saved, and ask where each template lives today.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
- **Records and logs.** If missing: Return the draft in the chat, and ask where it should live before you write it anywhere.
<!-- team-builder-stack:end spec -->

## Example

> **What I looked at.** Your 3 bots, the 7 skills in your library, and your team spec, version 4. I couldn't open Account C's routines. Can you show me its routine list?
>
> 1. **Your library has a skill named Triage work.** It takes the place of the plugin's Triage work, so your bots missed last month's fix. Fix: rename yours, such as to Triage requests, after your yes.
> 2. **The renewal note skill names Account A in step 2.** Account B would pull Account A's data. Fix: move the account to the routine. Made by Coach my bots.
> 3. **Your manager bot's morning kickoff runs on Lisbon time.** Your home time zone is New York, so Account B starts its day five hours early. Fix: the manager bot changes its kickoff's time zone. Made by Coach my bots.
>
> Nothing has changed. Your team map is still current. Want me to start on any of these?
