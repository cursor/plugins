---
name: setup-benny
description: Configure native Codex cron workflows for Benny Slack triage and verified bug reproduction.
---

# Set up Benny

Set up Benny as two periodic Codex project crons: `benny-triage` and `benny-reproduce`. Cron is polling, not an event subscription. Do not attempt to emulate a Slack trigger with a webhook, a plugin manifest, browser automation, or an undocumented backend.

Use the source material only as templates:

- [configuration example](../../automations/benny/templates/configuration.example.yaml)
- [triage cron prompt](../../automations/benny/templates/triage-automation-prompt.md)
- [reproduce cron prompt](../../automations/benny/templates/reproduce-automation-prompt.md)
- [routing example](../../automations/benny/skills/triage-issue-reports/references/routing.example.md)
- [feature-map example](../../automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md)
- [control-adapter contract](../../automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md)

## Prepare configuration

Create or review user-owned, secret-free files under the target project's `.codex/benny/` directory. Do not put tokens, credentials, private URLs, or other secret values in these files or in a cron prompt. A secret-manager reference or environment-variable name is acceptable.

Require these explicit configuration values before preparing a cron:

- Source Slack channel and optional operations channel
- Repository URL and default branch
- Triage identity
- Tracker adapter, team/project, labels, and status
- Control-adapter skill and completed feature map
- Poll cadence and bounded candidate lookback
- Status strings, effort budgets, and draft-only pull-request action

The source channel, triage identity, repository, tracker adapter, control adapter, and feature map are required. Fail closed if any is missing, placeholder-valued, or ambiguous. The target branch must contain committed `.codex/benny/` configuration before an automation is enabled.

Validate the optional routing map before enabling reroutes or owner pings. Keep pings off unless its rule and configuration explicitly permit the specific ping. Validate the control adapter with its harmless nine-step check before enabling the repro cron. Keep captures, recordings, logs, and temporary profiles outside the repository.

## Prepare native cron prompts

The triage prompt must invoke `$pstack:triage-issue-reports`; the repro prompt must invoke `$pstack:reproduce-and-fix-issues`. Each prompt must identify only a committed, secret-free `.codex/benny/configuration.yaml` path after confirming that exact project and branch contain it.

Prompts must state that each run:

- Polls the configured source channel on the approved cadence and processes only a bounded lookback.
- Derives and freezes the source channel and root thread coordinates from Slack, rather than from cron metadata.
- Stops without an external write when it cannot prove a candidate is unhandled, the coordinates are valid, or the relevant integration is available.
- Never posts a root message in the source channel.
- Keeps source coordinates, external writes, tracker mutation, commits, and pull-request actions with the root coordinator.

The triage cron uses `gpt-5.6-luna` at `xhigh`; the reproduce cron uses `gpt-5.6-terra` at `xhigh`. Both prompts must preserve this child-work routing:

- High-volume extraction and evidence verification: `gpt-5.6-luna`, `xhigh`.
- Ordinary repository analysis and bounded implementation: `gpt-5.6-terra`, `xhigh`.
- Hard debugging, performance, or security-sensitive work: `gpt-5.6-sol`, `xhigh`.
- Isolated bounded micro-edits: `gpt-5.3-codex-spark`, `xhigh`.

Child agents produce evidence only. Keep them read-only unless the root can prove the child has neither Slack credentials nor any external-write tool. No child receives secrets, posting instructions, or permission to accept work. The root coordinator reviews and accepts every child result before an external mutation.

Run final automation names and prompt shims through `$pstack:unslop`; preserve the safety gates rather than shortening them away.

## Create or update a cron

Never create or update an automation merely because configuration is complete. Ask for explicit authorization immediately before each create or update. A general request to set up Benny is not authorization; require a direct request naming the automation action, such as creating or updating `benny-triage`.

For every authorized project-cron creation or update:

1. Call `list_projects` before any cron mutation.
2. Resolve the exact target project with the user. If it is a Git repository, select a worktree execution environment; otherwise select local execution.
3. For an existing automation, first use `automation_update` in view mode and preserve its unrelated fields. Do not create a duplicate.
4. Use only Codex's supported `automation_update` tool with `kind: cron`, the selected `projectId`, the approved cadence, the correct model and `xhigh` reasoning effort, the completed prompt, and an explicit active or paused status.
5. Derive the tool's schedule field from the user-approved polling cadence. Do not hand-author or expose a raw schedule directive in a prompt or user-facing response.
6. Read back the resulting automation and report its name, project, cadence, and whether it is active or paused.

For an update, repeat the explicit-authorization check immediately before the mutation. Do not use a heartbeat for this standalone project work. Do not invent webhook support, plugin-manifest automation support, deep links, or an alternate backend.

## Verify safely

Before activation, run a harmless source-thread test in a test channel or against a test report. Confirm that triage posts exactly one reply with one marker, repro accepts only the configured triage identity's marker, source coordinates remain unchanged, and no source root post appears. Verify a missing/deleted parent, uncertain candidate, or failed preflight yields no tracker write and no Slack post.

Leave the cron paused until every safety check and the control-adapter check pass. Do not merge, deploy, or commit on the user's behalf.
