---
name: verify-work
description: "Called by every Verify step before anything is saved or shown; by default a fresh checker checks each claim."
---

# Verify work

**Type:** utility skill.

A bot never checks its own work, as [Independent verification](../explain-how-it-works/references/principles.md#independent-verification) says. The skill that calls this one says what to check; this skill says how, so the rules live in one place.

## Steps

1. **Take what to check** from the calling skill: the draft, the unit's ID, the calling skill, the sources that settle each fact, and the standard from its What good looks like and its template. Pass every point of What good looks like to the checker, word for word. The team spec's Systems of record says which system settles each fact. When several separate things need checking, run one check for each. Anything [Numbers and claims](#numbers-and-claims) covers always goes on to step 2. For the rest, go on to step 2 unless [When a fresh checker isn't needed](#when-a-fresh-checker-isnt-needed) allows a script check or a labeled self-review. If it covers everything there is to check, record that result as the section says and go to step 6. If it covers only part, such as one question a script settles, record that result and go on to step 2 for the rest.
2. **Start a fresh checker.** A new conversation with no part in the draft, told exactly what to check and against which sources, and wait for it. Give it each skill it must follow by its name. It reopens each source itself and checks each claim and the standard. It grades the draft against every point of the calling skill's What good looks like, one line each: pass or fail, with a one-line reason. It confirms every fact belongs to the unit being worked on, found by its ID, such as the right account, and fails any fact mixed in from another unit. It fails any open question or gap the sources could have answered. It fails any question put to the person that the sources could answer, and any offer to go ahead on an unchecked fact. When a guideline applies, it reads it fresh, and the result notes which version or date it checked against. Start the checker from the bot's own turn. If the work ran in a subagent, the subagent returns its results and stops, and the bot that started it starts the checker. A subagent never tries to start the check itself.
3. **If that fails, send the check to the bot under Who verifies** in the team spec, a specialist or manager bot. Its answer arrives later as its own message: write nothing until then, and finish the check when it arrives. If Who verifies says none, or that bot can't run the check either, write nothing, and tell the manager bot (or the person, if there's no manager bot) that the check couldn't run, with the exact error text.
4. **If a source the check needs is down,** stop and ask the person to help get it back up before going on. In a scheduled run with nobody around, go on with what you have, mark each claim that source settles as unchecked, and say what was missing in the result.
5. **Never mark it passed when the same bot ran the check.** The one exception is a script check, where the recorded output decides. An in-line read of your own draft isn't a check, and a labeled self-review is never marked passed.
6. **Return the result** to the calling skill: each claim passed or failed with its source, and each point of What good looks like passed or failed with its reason. For a script check, return the script and its output. For a labeled self-review, return the label and the yes or later check it rests on, never a pass. The run's checklist is the skill's steps, copied at Load. A skipped step stays on that list with its reason. A skip with no reason fails. Nothing is saved or shown until every line passes or the person decides.

## Numbers and claims

Four kinds of content always get a fresh checker, as step 2 says, in any output that reports to the person or to anyone outside the team, or writes something others act on, as Full check below says, including a quick chat reply. Each one gets its own line in the check.

- **A figure.** Any number the output states as a fact, such as an amount, a count, a rate, or a total. The checker traces it to its source row and its period: the row for this unit in the source it came from, for the dates the figure covers. A number the person chose in this chat, such as how many notes to read, is their choice, not a figure.
- **A claim that something was filed, sent, or done.** The checker opens the system of record again and finds the entry itself, such as the filed note on the unit's record or the closed task in the task list. The bot's own word, or the reply its tool gave when it wrote, is not the check.
- **A claim that something doesn't exist,** such as no open tickets or no reply yet. The output shows the search that was run: where, for what, and over which dates. The checker runs that search again. When no search is shown, or the checker's search finds something, the claim is reworded to say only what the search found, or dropped.
- **A data pull the person asked for,** such as a list, a count, or a lookup of records. The whole reply gets the full check, even when it is a short chat reply.

A labeled self-review or a script check never stands in for this check, with one exception: a bot's read-back of what only it can see, its own memory and the routines it saved in its own chat. No checker can open those, so the read-back, including its counts and what it changed, is worded as that bot's own report, such as "Account A reports it removed 3 facts", labeled as When a fresh checker isn't needed says, and never called checked. Any other output, including a quick chat reply with none of these four, keeps the rules in the steps above and in When a fresh checker isn't needed. The checker's own report isn't checked again: its result goes back to the calling skill, as step 6 says.

## When a fresh checker isn't needed

A fresh checker, as the steps above say, is the default and the safe choice. Use something cheaper only where this section allows it, and never for the four kinds in [Numbers and claims](#numbers-and-claims). When in doubt, start a fresh checker.

- **Full check.** A full fresh check is required whenever the output reports to the person, or to anyone outside the team the work reaches, or writes something others act on. A write others act on means a write to a system the team spec lists under Systems of record, a skill, or the team spec. A handoff message counts too, unless the receiving bot goes back to the sources for every fact it uses. A draft or a plan shown for the person's yes may use a labeled self-review only when every fact in it is one the person set or gave in this chat, such as their own plan, a choice they made, or their own wording, and it holds none of the four kinds in Numbers and claims. A draft that states facts taken from sources, or that will go to anyone outside the team, gets a full check before the person sees it. One output can't be checked against its source: a bot's read-back of what only it can see, its own memory and the routines it saved in its own chat, reports to the person, but only that bot can see it, so no checker or script can read the source. A script may still compare the read-back with approved text, as Script check says. Whether it was saved is a labeled self-review, as [Clean up memory](../clean-up-memory/SKILL.md#apply) says.
- **Labeled self-review.** Otherwise, a self-review is allowed only when the person's yes or a later full check covers the same facts before anyone acts on them. It is labeled "Self-reviewed, not independently checked" in exactly what the person sees, and it is never called passed or checked. A self-review isn't a check: the yes or the later full check is. For the yes, [Plan the work](../plan-the-work/SKILL.md#steps)'s Verify step already says it: the person's yes is the check. A yes covers only what the person was shown and can judge for themselves, so it never covers a fact from a source they didn't see, or something left out, such as a dropped item or a missed conflict. So an output whose point is that nothing is missing, such as a list of every open item or every conflict, gets a full check. A self-review never covers the four kinds in Numbers and claims, except the one read-back that section names.
- **Script check.** A script check is allowed for a yes or no question a script can settle about files or exact text, for example whether exact text is present, whether a file changed beyond an approved edit, or whether a bot's read-back matches approved text byte for byte. It stands in for the full check only on that question, and never for the four kinds in Numbers and claims, except the one read-back that section names. Every other claim in the same output still gets the full check. Record the script and its output as the result. The output, not the bot's read, decides pass or fail. If the script can't run, or the question needs reading for meaning, fall back to a full check, never to a pass.
- **Rechecks.** Every check is fresh: after a fix, a new checker reads the earlier result and the fix, plus anything that cites the same source, depends on the changed fact, or sits in the same step.
- **No change in a scheduled run.** When a script, or one quick read per source, shows nothing changed since the last run, the scheduled run writes no dated file and delivers no summary, adds one line to its run log, and skips the check. That line names each read it ran, so the no-change call shows its search. The run log line isn't output the Full check reaches; a count later reported from it gets the Numbers and claims check. This is the cheap check that opens Load in [How to fill each step](../write-a-workflow-skill/references/workflow-skill.md#how-to-fill-each-step). The no-change call is never the bot's judgment: a change is whatever the skill names as one, including work that falls due. A source that can't be read counts as a change.
- **Stop rule.** A failed check gets one fix, with at most two rounds of fixes in all, as Plan the work's stop rules say. Anything still failing is listed as not covered, never guessed, and nothing is written while it waits on the person. A round that starts because the person changed the ask starts the count again.

## What good looks like

- The checker had no part in the draft, and reopened every source itself.
- Every claim and the standard were checked, one line each, with the source.
- Every figure is traced to its source row and period, every filed, sent, or done claim was found again in its system of record, every claim that something doesn't exist shows its search, or was reworded or dropped, and a data pull the person asked for got the full check.
- Every fact belongs to this unit; one from another unit fails the check.
- A failed start is reported with its exact error, never passed over.
- Every point of the calling skill's What good looks like got its own pass or fail, with a reason.
- A self-review is labeled in what the person sees and names the yes or later check it rests on.

## Team spec

<!-- team-builder-stack:begin spec team,systems -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
- **Systems of record.** If missing: Ask which systems the work lives in, and check each connected one with a read-only lookup before you rely on it.
<!-- team-builder-stack:end spec -->

## Example

A result returned to the renewal note skill, with made-up names:

> **Check of Account A's renewal note, by a fresh checker.**
> - Renewal date 1 April: matches the CRM (linked).
> - 40 more seats asked for on 26 Sep: matches the call (linked).
> - What good looks like, 'Under 200 words': fail, 240 words.
>
> 2 of 3 lines passed. One fix before anything is saved: cut the note to 200 words or fewer.

The bot cuts the note to 190 words, and a new fresh checker reads the earlier result and the fix, plus the lines that sit in the same note:

> **Recheck of Account A's renewal note, by a new fresh checker.**
> - What good looks like, 'Under 200 words': pass, 190 words.
> - Renewal date 1 April: still in the note, and matches the CRM (linked).
> - 40 more seats asked for on 26 Sep: still in the note, and matches the call (linked).
>
> 3 of 3 lines passed. Nothing else to fix.

A Numbers and claims check of Account A's weekly update, with made-up names:

> **Numbers and claims in Account A's weekly update, by a fresh checker.**
> - "1,240 active seats in September": fail. The usage report's row for Account A shows 1,240 for August and 1,310 for September (linked). Fix the month or the number.
> - "Call summary filed to Account A's page": pass. The entry dated 2 October is on the page (linked).
> - "No open support tickets": fail. The draft shows its search: Account A's ID in the ticket system, status open, any date. Run again, the search finds one ticket opened yesterday (linked). Reword the line to name that ticket, or drop it.
>
> 1 of 3 lines passed. Two fixes before anything is saved.

A labeled self-review, shown with a plan for the person's yes, with made-up names:

> **Self-reviewed, not independently checked.** Plan for Account A: read the 20 call notes you asked for, four at a time. You set every fact in it, so your yes on this plan is its check. Each objection it finds gets a full check against its note before anything is saved.
