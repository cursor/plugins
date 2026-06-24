# benny automation intent

## what i want to automate

i want two cursor automations that work together in one slack issue channel.

### automation 1: triage issue reports

- trigger: when someone posts a new top-level report in my configured source slack channel, i want this automation to start on that report and keep its original thread coordinates.
- behavior: i want it to read the thread and attachments, classify the report as a bug or performance issue, feature request, question or feedback, or reroute, and trace the likely owning layer before routing.
- tracker: i want it to search my configured tracker for duplicates, update a confident duplicate, and create a ticket only for a clear net-new bug.
- tools: i want slack thread read and reply access, my configured tracker integration, and my optional routing map.
- outcome: i want exactly one reply in the source thread with a short verdict and `[benny:bug]`, `[benny:performance]`, or `[benny:other]`. a bug or performance marker may include the tracker url.
- boundary: i never want this automation to post a root message in the source channel.

### automation 2: reproduce and fix confirmed bugs

- trigger: i want this automation to start from the same new top-level report, or another supported trigger that `/setup-benny` and i choose, then wait for the trusted triage marker in the original thread.
- gates: i want it to stop when someone clearly owns the fix. if an existing pull request or merged commit may fix the report, i want verification instead of a competing change.
- behavior: i want it to use my configured control adapter and feature map, reproduce the exact symptom twice through the real ui, and capture screenshots, video, and a read-only state cross-check.
- fix: i want it to verify existing pull requests without authoring over them. after a confirmed repro, it may attempt one bounded root-cause fix, use tdd when the test is cheap, smoke the blast radius, and open a draft pull request only when before-and-after proof passes.
- tools: i want slack thread read and reply access, repository and history access, draft pull request creation, my configured tracker, and my control adapter.
- outcome: i want evidence and a verified result in the source or optional operations threads, plus an optional draft pull request. updates should be concise.
- boundary: i never want this automation to post a root message in the source channel.

### shared rules

- i want the source channel and root thread coordinates to stay immutable for the whole run.
- i treat utility and debug bots as evidence, not delegation or fix ownership.
- i allow subagents to help, but they cannot post to slack or receive slack credentials.
- i want pstack enabled through the target repository's committed `.cursor/settings.json` so fresh automation checkouts can load every required skill.
- i want live automation prompts to invoke project-scoped pstack skills by name. i do not want plugin cache paths or copied skill subsets.
- i keep configuration and secrets outside the plugin.
- i want both automations to fail closed when channel coordinates, tracker access, the control adapter, or the feature map are missing or uncertain.
- i want draft pull requests only. do not merge or deploy.

### my configuration

- source slack channel: `<channel>`
- optional operations channel: `<channel or none>`
- repository and default branch: `<repo>`, `<branch>`
- tracker: `<type, team, project, labels, intake status>`
- routing map: `<path or none>`
- triage identity: `<slack identity>`
- control skill: `<name-addressable skill>`
- feature map: `<committed same-repo path or behavior to paraphrase>`
- models: `<triage, reproduce, code, media review>`
- status emoji strings: `<seen, reproducing, reproduced, blocked, fixing, failed, pull request opened>`
- budgets: `<polling, verdict wait, follow-up, repro, rejection, fix>`
- optional bot token capability: `<none, file download, or editable operations status>`

start from [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md). copy and fill them outside the plugin. keep secret values in a secret manager or environment.

## for the agent

read [`setup-benny`](./skills/setup-benny/SKILL.md) and follow it. do not ask for benny configuration or use `/automate` until pstack is installed and verified in the target repository.

i want you to merge this entry into the target repository's `.cursor/settings.json`:

```json
{
	"plugins": {
		"pstack": { "enabled": true }
	}
}
```

preserve every unrelated setting and plugin. preserve comments and valid jsonc syntax when the existing file uses jsonc.

i want verification from a fresh agent rooted in the target repository. confirm that `setup-benny`, `triage-issue-reports`, `reproduce-and-fix-issues`, `how`, `why`, `tdd`, `unslop`, and the principle skills used by benny resolve in project scope. do not count skills loaded from the current session or a user-scoped install.

if project-scoped plugins are unavailable or any required skill does not resolve, stop and explain what failed. do not copy only the benny skills. they depend on the rest of pstack.

tell me that `.cursor/settings.json` must be committed before either automation is enabled. do not create or update an automation until i explicitly ask.

for first-time creation, use built-in `/automate` once for triage and once for repro and fix. complete the draft review, approval, readiness check, and Automations editor handoff for the first automation before starting the second.

paraphrase this intent and the finished configuration into each draft. tell each live prompt to invoke its project-scoped operational skill by name. do not embed an installed plugin path or plugin file content in a live automation field. reference a repo file only when `/automate` confirms it is committed in the same repository where the automation will run.

for existing automations, do not use `/automate` to inspect or update them. validate the configuration, then give me the concise field checklist from `/setup-benny` so i can edit each automation directly in its editor. do not create duplicates.
