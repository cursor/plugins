---
name: apply-a-plugin-update
description: "Use when the installed plugin is newer than the team spec records; applies only the approved changes."
---

# Apply a plugin update

**Type:** workflow skill.

Brings the person's existing team in line with one release of this plugin. A plugin install changes the skills. This skill applies that release's other changes: shared rules, operating guide layout, profile facts, routine form, and team spec layout. It changes nothing until the person approves it.

Write only a rule that holds for every bot running that item. A fact about one unit of work stays in that unit's record or that bot's memory, and a request that carries one is rewritten as a general rule or declined.

## Steps

1. **Load.** Read this skill at its path. Read the team spec, including Plugin version applied on the Team Builder block and the Routines section. Read the installed plugin version from `team-builder-stack/.cursor-plugin/plugin.json`. It must match the `Team Builder · version` line in [Team Builder operating guide](../team-builder-operating-guide/SKILL.md). If those two differ, stop and say so. When Plugin delivery says synced into the library by the plugin maintainer, the plugin is not installed and there is no plugin.json: the installed version is the Team Builder · version line in the library copy of Team Builder operating guide. Open [every bot's operating guide](../build-a-bot/references/operating-guide.md), [Team Builder's profile](../set-up-team-builder/references/team-builder/profile.md), [Weekly review prep](../set-up-team-builder/references/team-builder/routines/weekly-review-prep.md), and the [blank team spec](../build-my-team/references/team-spec-template.md).
   Does: Read this skill, the spec, the installed version, and the templates this release compares.
   Pulls from: the team spec, plugin.json or the library copy of Team Builder operating guide when the library is synced, and the templates named in this step
   Uses: none, this step only reads files
   Produces: the run checklist, including any skipped step and its reason
   Hands to: Do the work, and it does not wait
   Needs your review: none, nothing is decided yet
   Copy this skill's steps into the run's checklist. A skipped step stays listed, with its reason.
2. **Do the work.**
   Does: Compare the team with the checklist or the current templates and bring one list.
   Pulls from: the checklists after the applied version, or the current templates when none is recorded
   Uses: none, the person approves in this chat
   Produces: one numbered list of changes
   Hands to: the person, and it waits for a yes
   Needs your review: which numbers to apply
   - **Which changes.** When Plugin version applied is missing or blank, do not use the checklists as a delta. Compare the whole team with the current templates: each bot type's operating guide against every bot's operating guide, each bot's three profile facts against the profile fact templates, Team Builder's about line and profile facts against its profile file, each live routine against Routines and against the thin prompt form, and the spec against the blank team spec, including Plugin version applied and Routines. When a version is recorded and the installed version is newer, read only the checklist for each version after the applied one, up to and including the installed version, lowest version first. Checklists live in [references/checklists/](references/checklists/), one file per version: [0.15.0](references/checklists/0.15.0.md), [0.16.0](references/checklists/0.16.0.md), [0.17.0](references/checklists/0.17.0.md), [0.18.0](references/checklists/0.18.0.md), [0.19.0](references/checklists/0.19.0.md), [0.20.0](references/checklists/0.20.0.md), [0.20.1](references/checklists/0.20.1.md), and [0.21.0](references/checklists/0.21.0.md). Compare versions by their numbers from the left. Check every bot's operating guide, profile facts, and routines, and the spec, against only the items in those checklists. A category that says none is not a change. When the installed version is not newer, say so in one line and stop.
   - **One list.** Bring the person one numbered list, from the template below. One item per change that is not already in place. Name the bot or the spec, the current text, and the proposed text. Skip anything already true. Never overwrite an edit the person made. Where their text and the plugin's overlap, theirs wins, and that edit goes back to the plugin as a suggestion the way the Review part of Run the weekly bot review says, and no other way. A library skill with a Team Builder skill's name is a copy: offer to rename it, and do not edit it. Skip the rename offer when Plugin delivery says synced into the library by the plugin maintainer; there the copies are how every bot reads them. A Team Builder skill changes through the plugin.
   - **Apply only the yes.** Ask before you change anything. The yes covers exactly the numbers they approve. For each approved change to a profile fact, a standing rule, or a routine, message that bot, and only that bot, what it changes. The bot saves that change because you sent it after the person's yes, and only that bot creates or changes its own routine, from the Routines section. A fact about a unit of work, or a preference a bot learns while doing the work, stays in that bot's own memory and does not go through this skill. You write the spec, and you save a changed operating guide or other library skill through Grok Bot's own way of saving a skill. Before you change a file, keep one dated backup of that file. After the save, delete anything else this run staged, including drafts and extra copies. Do not leave a second copy where a bot would run it.
3. **Verify.** Run [Verify work](../verify-work/SKILL.md) on the result and wait for it. Give it the approved list, the saved spec, the saved guides, and what each bot reported back. You do not grade your own check.
   Does: Have a fresh checker grade the saved result against the approved list.
   Pulls from: the approved list, the saved spec, and what each bot reported
   Uses: none, Verify work starts the checker
   Produces: a pass or fail for the check
   Hands to: Record, and it waits for the checker
   Needs your review: none, the checker grades this
4. **Record.** After the person has answered each item, set Plugin version applied to the installed version, then update the spec's version, date, and change log. Write any skipped item in the change log so it is not dropped. Do not record the version if they have not answered the list. Then rebuild the team map from the spec.
   Does: Set Plugin version applied after every item has an answer, and update the change log.
   Pulls from: the person's answers and the installed version
   Uses: none, this writes the team spec
   Produces: the updated spec and a rebuilt team map
   Hands to: Hand off, and it does not wait
   Needs your review: none, the yes already happened
5. **Hand off.** Tell the person what changed, what they skipped, and the version now recorded. Message each bot only what that bot still has to save.
   Does: Tell the person what changed, what they skipped, and the version now recorded.
   Pulls from: the saved spec and what each bot still has to save
   Uses: none, messages go only to the bot that must save its own change
   Produces: the closing note
   Hands to: the person, and it does not wait
   Needs your review: none, the list was already approved

## What good looks like

- The list came from the checklists since the applied version, or from the current templates when no version was recorded.
- Nothing changed that the person did not approve.
- Each bot was told only the profile fact, standing rule, or routine it saves after the yes.
- Shared text holds a rule for every bot running that item, and no fact about one unit.
- One dated backup remains for each changed file, and nothing else this run staged remains.
- Plugin version applied is the installed version.

## Template

```markdown
# Plugin update, to <installed version>

Nothing changes until you say yes to a number.

1. **<Shared rules, operating guide layout, profile facts, routine form, or team spec layout>.** <Bot type, bot, or the spec>. Current: <text, or missing>. Proposed: <text>. From <checklist version, or the current templates>.
```

## Team spec

<!-- team-builder-stack:begin spec role,team -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your role.** If missing: Ask only for what this task needs. Ask for the home time zone before you write any schedule, and write it in that zone.
- **Your team.** If missing: Ask which of the person’s bots owns the work before you route or hand anything off.
<!-- team-builder-stack:end spec -->

Also read Routines, and Plugin version applied on the Team Builder block. If Routines is missing, say so once and draft it from the live routines and the blank team spec. If Plugin version applied is missing or blank, compare the whole team with the current templates instead of the checklists.

## Example

The spec has no Plugin version applied, and the installed plugin is 0.15.0.

> Your team spec has no plugin version yet, so I compared the whole team with the current templates. Nothing is changed until you say yes.
>
> 1. **Shared rules.** Owner operating guide. The shared rules are missing the line that a bot saves facts about its unit of work, and preferences it learns while doing the work, to its own memory without asking, and that a change to how it works goes through Team Builder with Inform Team Builder and is saved only when Team Builder sends it after a yes. Proposed: add that line, word for word.
> 2. **Team spec layout.** Routines. Account A has a live routine that the spec does not list. Proposed: copy its trigger and full prompt into Routines. The live routine stays as it is.
>
> Apply both, or one?
