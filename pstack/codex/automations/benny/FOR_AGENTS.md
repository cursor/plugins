# Benny automation intent

## What Benny does

Benny provides two native Codex project cron automations for Slack issue reports.

1. **Triage** periodically polls one configured Slack source channel for unhandled top-level reports. It reads the report thread and attachments, classifies it, traces the likely owning layer, deduplicates through the configured tracker, and posts exactly one concise reply in the original thread. The reply ends with `[benny:bug]`, `[benny:performance]`, or `[benny:other]`; a bug or performance reply may include the tracker URL.
2. **Reproduce and fix** periodically polls the same source for trusted triage replies. It stops for human ownership or a plausible existing fix, otherwise reproduces an eligible issue twice through the real UI, preserves evidence, and may create one bounded draft pull request after before-and-after proof.

Both runs preserve immutable source-channel and root-thread coordinates. Neither may post a root message in the source channel. Utility bots are evidence, not delegation or fix ownership. The coordinator is the only external writer; child agents receive no Slack credentials, posting instructions, or external-write authority.

Codex cron runs are time-based. They cannot natively start from a new Slack message, retain an event payload between runs, or use a webhook. Each run therefore polls the configured Slack integration on a user-approved cadence, uses the existing thread marker/history to prove that a candidate is unhandled, and stops without writing when it cannot do so safely.

## Configuration

Start from [`configuration.example.yaml`](./templates/configuration.example.yaml), [`routing.example.md`](./skills/triage-issue-reports/references/routing.example.md), and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md). Copy and complete them as user-owned, secret-free project files under `.codex/benny/`; for example:

- `.codex/benny/configuration.yaml`
- `.codex/benny/routing.md`
- `.codex/benny/feature-map.md`

Keep secret values in the configured secret manager or environment. Files and prompts may name a secret reference or environment-variable name, never contain its value.

The configuration must identify the source channel, optional operations channel, repository and default branch, triage identity, tracker adapter, control adapter, feature map, status strings, effort budgets, and polling cadence. The source channel, triage identity, repository, tracker access, control adapter, and feature map are mandatory. Missing or uncertain inputs stop the relevant run.

## Native Codex setup

Invoke `$pstack:setup-benny` from the repository that will host the cron worktrees. It validates the secret-free configuration, project capabilities, and harmless thread-safety/control-adapter checks. Commit `.codex/benny/` before enabling a cron.

`$pstack:setup-benny` must obtain explicit user authorization immediately before it creates or updates either automation. For a project cron it first calls `list_projects`, resolves the user-selected project, and only then uses Codex's supported `automation_update` tool to create or update a `kind: cron` automation. Do not substitute webhooks, plugin manifests, deep links, browser form automation, or an undocumented backend.

The cron prompts invoke `$pstack:triage-issue-reports` and `$pstack:reproduce-and-fix-issues`. They read the committed `.codex/benny/` configuration only after confirming the selected project and branch contain it. Existing automations are inspected and updated through the supported automation tool after authorization; do not create duplicates.

## Model routing and authority

Within either cron, the root coordinator owns source coordinates, final acceptance, external writes, tracker mutation, commits, and draft pull-request creation. It treats all child outputs as evidence, not approval.

- Route high-volume extraction and evidence verification to `gpt-5.6-luna` at `xhigh`.
- Route ordinary repository analysis and bounded implementation to `gpt-5.6-terra` at `xhigh`.
- Route hard debugging, performance analysis, or security-sensitive reasoning to `gpt-5.6-sol` at `xhigh`.
- Route an isolated, bounded micro-edit to `gpt-5.3-codex-spark` at `xhigh`.

Children are read-only unless the coordinator has isolated the task from Slack credentials and all external-write tools. Even then, the root coordinator reviews and accepts the result before any external mutation. Never put secrets in a child prompt.
