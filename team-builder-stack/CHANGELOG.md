# Changelog

Changes to the Team Builder Stack, for people using it. Newer entries come first. A release turns Unreleased into a version entry.

## 0.21.0 (2026-10-14)

- Each bot on the team map has its own look: a colored shape with its initials, drawn with plain CSS. The shapes are circle, square, hexagon, capsule, leaf, and drop, in a calm palette with no red, amber, or gray.
- The team spec adds optional Shape, Color, and Picture lines to each bot block under Your team. A value set there wins. When one is empty, the map picks it from the bot's id, never from the bot's place in the spec, so the same bots always draw the same map and no two bots on one map share both a shape and a color. On a proposed change, a bot whose Shape and Color lines don't change looks the same in the proposed and the current view, and a removed bot shares a look with no remaining bot.
- A Shape off the list or a Color that isn't a six-digit hex color is listed by the spec check. When the map is built anyway, it warns and uses the default for that field.
- You can give pictures for your bots, by a Picture line or a folder of files named by bot id. The map script shrinks a PNG and embeds it as a small data URI of at most 24 KB. A JPEG, GIF, or WebP is embedded only when it is already under that size. A JPEG loses its EXIF, XMP, and comment segments first. A GIF or WebP keeps any metadata it carries. A picture that is missing, unreadable, or too large gets a warning, and the map shows the shape and color instead. Pictures are read when the map is built and are never copied into the plugin.
- After your yes, the steps that save a changed team spec in Build my team, Check my bots, Build a bot, Retire a bot, and Set up Team Builder write each bot's look into its empty Shape and Color lines, the look the map showed you. A look you set is never changed. From then on every look is fixed in the spec, so a later rebuild moves none.
- The Markdown team map lists each bot's look.
- The apply checklist adds the three lines to each bot block in the team spec after your yes, and records the looks the map shows today.

## 0.20.1 (2026-10-14)

- A proposed change to the team map now marks routines as added, changed, or removed, the same way it marks bots, skills, steps, handoffs, and systems. A proposal that only changes routines is counted as a change instead of changing nothing. The canvas and the Markdown document both show the marks. A change to a routine's runs per week is marked, and its old count shows only in the document.

## 0.20.0 (2026-10-14)

- Inform manager bot also runs when a check the manager bot asked a bot to run finishes, such as reading what a meeting decided once it ends. The note's header is `<Unit>: <item> checked.` It names the one item the manager bot tracks it by, gives the checked result in one sentence with its source link, and lists each task done, filed, or moved, or nothing. It keeps Waiting on, and Needed from you can name an unblock or an update to today's brief.
- A check the manager bot asked for always gets a note, even when nothing changed and even on delegated work. The manager bot acts on it now only when the result changes today's brief or leaves a block. Delegate work and the Hand off guidance in Write a workflow skill say the same. An existing workflow skill picks up that line only when the skill is rewritten.
- Only the manager bot writes the daily brief. The bot sending the note changes the task list first and never edits the brief. When a note says today's brief is out of date, the manager bot corrects those lines from the task list, not the note.
- A check's Outcome, and each change on its Changed line, are facts the check's own Verify step passed through Verify work. If no Verify step ran, the bot runs Verify work on them before the note is sent.
- Every place that lists when Inform manager bot runs names the check too, including the Owner bot line under Who tells whom. The apply checklist carries that line to each owner bot's operating guide after your yes.

## 0.19.0 (2026-10-13)

- A fresh checker stays the default and the safe choice. Verify work now says exactly when a cheaper check is allowed: a script check for a yes or no question a script can settle about files or exact text, or a self-review labeled "Self-reviewed, not independently checked" when your yes or a later full check covers the same facts. A draft or plan gets a self-review only when it is made only of facts you set or gave in the chat. A draft with facts from your sources, or one going outside the team, gets a full check before you see it.
- Anything that reports to you, reaches anyone outside the team, or writes to a system of record, a skill, or the team spec still gets a full check. A script check stands in for it only on a yes or no question a script can settle about files or exact text, and every other claim still gets the full check.
- A recheck may reuse the same checker, which also reads anything the fix touches. A fix that is large, changes logic, or uses the checker's own wording gets a fresh checker.
- A scheduled run that finds nothing changed writes no dated file and delivers no summary. It adds one line to its run log and skips the check. A failed check gets one fix, with at most two rounds of fixes in all.
- The shared rule every bot follows names the script check and the labeled self-review. The apply checklist carries that one sentence to each bot's operating guide after your yes.
- Clean up memory labels its Apply read-back a self-review. The weekly review checks each file edit it applies with a script check. A routine change gets a full check. A profile fact change is a read-back, script checked against the approved text and shown labeled as a self-review.

## 0.18.0 (2026-10-13)

- Each routine run spends usage, so a routine that runs often spends more than one that runs rarely. A test run also spends usage.
- The team spec records runs per week on each routine, counted from its trigger. Weekly review prep asks each bot for the routines it owns and flags a schedule that runs more often than the work needs. Runs per week is in the map data and on the document line for this release, and is not drawn on the canvas.
- When a routine starts a workflow skill, that run opens with a cheap check and ends when nothing has changed. An existing workflow skill picks up that check only when the skill is rewritten.
- In Team Builder's skills, a scheduled run gathers, drafts, and reports. It writes a dated file, delivers a summary where the routine says, and ends with a Needs you list instead of waiting for an answer. Decisions, approvals, and questions wait until the person replies in the chat with the bot. Weekly review prep drafts the review pack before the meeting, including the checks and the review page. Memory reports wait until the person replies to the summary in the chat. Applying changes waits until the person says yes in the chat. Morning kickoff writes the dated file first. If it also names a message, Test checks that hand-off, or the first scheduled run does where the routine doesn't show Test. A missing message falls back to the person confirming the ask in the manager bot's chat.
- Inform Team Builder names its message field Act now, not Wake. Inform manager bot and Inform Team Builder say a note is sent so that bot acts on it now, for a failed run or a wrong write, or a block, a decision, a deadline at risk, or a change to today's brief. Other notes are sent without asking that bot to act now.
- Coach my bots picks the widest schedule that still meets the deadline, prefers an event trigger or a check-back that deletes itself, and writes each new routine with its runs per week and one Test run where the routine shows Test; otherwise the first scheduled run. An existing workflow skill gets Load's cheap check only when it is rewritten. A test spends usage, so it is not repeated for the same result.
- Build a bot never gives a bot a setup that creates routines on its first run.

## 0.17.0 (2026-10-13)

- Inform manager bot updates the task and sends the manager bot a linked note when a task finishes, is blocked, or the person changes it in chat. It asks the manager bot to act now for a block, a decision, a deadline, or a change to today's brief.
- A change the person makes in chat is written on the task first, with one line that quotes them, and still gets a note when the manager bot delegated the work.
- When that change makes today's brief out of date, the manager bot corrects those lines in place and sends the person nothing. The task list stays the record.
- Plugin delivery, next to Plugin maintainer, says whether the plugin is installed or the plugin maintainer syncs the stack skills into the person's library. Apply a plugin update reads the Team Builder version line in that synced setup, and it skips the rename offer.
- A none review that cites an earlier yes passes only when it names a step that exists and that step itself asks for a review.

## 0.16.0 (2026-10-13)

- A workflow skill's steps carry Does, Pulls from, Uses, Produces, Hands to, and Needs your review. A field is never blank. Write none and the reason.
- A skill description is one sentence under 120 characters.
- The team spec adds Waits on each handoff, You and Every bot as handoff ends, Connectors on each bot, an optional How to read on each system, and Skill plus an optional Relayed by on each routine.
- A check reads those fields and the skill library. It lists what is missing, per bot and skill. The team map draws only from the fields. A fact it cannot find is marked inferred.
- Check my bots runs that check across the library and the spec. The report opens with one outcome, and each bot is covered or not confirmed.
- A run's checklist is the skill's steps. A skipped step stays listed, with its reason.
- When a skill several bots use changes, the old and new versions are run on one example, and a fresh checker grades both without being told which is which.
- When the same correction comes up again, add a field or a check before adding another sentence of guidance.

## 0.15.0 (2026-10-12)

- Each release ships an apply checklist of the changes an existing team needs.
- Apply a plugin update brings one list of those changes and applies only what you approve. The team spec records the plugin version last applied.
- Weekly review prep checks that version and runs the full bot check against the spec and the principles. It stays weekly.
- A bot keeps saving facts about its unit, and preferences it learns while doing the work, to its own memory. A change to how it works, a skill, an operating guide, a routine, or a standing rule, goes through Team Builder with Inform Team Builder, and the bot saves that only after you say yes.
- Shared text holds only a rule that applies to every bot running that item. A fact about one unit stays in that unit's record.
- The team spec lists each bot's routines, with the trigger and the full prompt, and routines are saved from that list.
- An approved change to a skill this plugin ships is sent as a suggestion to the plugin maintainer named in the team spec. The local copy is not edited.

## 0.14.2 (2026-10-12)

- A change to what a handoff passes stays on that handoff, including when its how changes or another handoff between the same bots uses the same how.

## 0.14.1 (2026-10-12)

- A workflow skill's own steps are named lines under Do the work, and the team map shows each one.
- Two handoffs between the same bots stay separate on a proposed change, and an edit to one is marked as a change.
- Removing one handoff and editing another between the same bots marks the edited route and the removed route, each as itself.
- The guide counts six utility skills, the six the stack ships.
- The utility skills table names Triage work, Delegate work, Verify work, Plan the work, Inform manager bot, and Run review panel. Record keeping and context loading stay in each workflow's load and record steps.
- The README and the guide stay on the same count of utility skills.

## 0.14.0 (2026-10-12)

- The plugin logo is the author's portrait.
- The README opens with who made the stack, how it works in seven steps, and what's in it.
- Make no assumptions is the principle between Context cascade and Just-in-time context. The check-first rule every bot follows is unchanged. Handoffs & delegation is now Handoffs and delegation, and the principles are in one order everywhere.
- Units are sized to your scope of work: a few strategic accounts each get a bot, and a book of 150 renewals gets one.
- Your primary bot is usually your manager bot, and you can talk to any bot directly.
- Team Builder recommends a missing bot during weekly review prep, and builds it on your yes.
- Manager bots follow up on blocked, at-risk, or overdue work. Check my bots shows existing manager guides a one-line difference.

## 0.13.0 (2026-10-11)

- The weekly bot review, with one prep routine that starts two hours before it. The old bot-check routine and the old update-check routine are retired.
- Clean up memory: each bot lists stale facts in its own memory, and applies only what you approve.
- A routine names one skill. The steps live in that skill.
- Release checks run on the copy that ships, so a public release is the built plugin.
