# Host deployment and executable poll contract

This pack is dormant. No schedule, service connection, Slack reply, ticket or PR is created by installation. The migration was tested with simulated adapters; external trigger and application reproduction are unverified.

## Paths and refresh

The installed support skill is the source of the merge tool. Run `node <actual-installed-pstack-host>/benny-tools/merge-pack.mjs <target-project> <source-commit>`; take source-commit from the installed support metadata. The copied pack lives at `.pstack/benny/`. Refresh records live at `.pstack/benny-install.json`; they contain source SHA and each successfully read-back file's SHA-256 hash. They must be retained to distinguish managed files from local edits. Unknown ownership or conflicting edits stops the whole update before file writes. Resolve by reviewing the source/local diff; no force-overwrite flag exists. Destination-only files remain.

Keep secret-free configuration, routing and feature maps in `.pstack/benny-user/`, outside the pack. The upstream YAML example remains reference material; the executable runner consumes JSON with the same nested `slack`, `repository`, `tracker`, `control` and optional `routing` values. `configuration_path` is supplied from the runner argument; it can be omitted from the saved JSON. Tokens are never stored in these files. A host/tool adapter is a user-owned module outside the pack. The runner does not discover credentials or silently substitute a connector.

Commit the copied instruction files, runner, configuration, routing and feature map to the target repository. Run each instruction's shared-dependency verification from a fresh session rooted in that project. All principles named in the copied setup file must resolve there. Host global visibility is insufficient.

## Execute a poll

From the target repository, the executable command is:

```sh
node .pstack/benny/scripts/poll.mjs . .pstack/benny-user/configuration.json .pstack/benny-user/adapter.mjs
```

A schedule must execute this command in the same project directory. A prompt that merely reads instructions without obtaining channel events is insufficient. Each poll enumerates top-level reports and resumes retained thread records. Reply events never become new root reports. The source channel and root timestamp form the durable dedupe identity. State lives outside the pack in `.pstack/benny-state/events.json`. A directory lock prevents simultaneous runs; after a crash, verify the runner is stopped before removing `.pstack/benny-state/poll.lock`. Then rerun: uncertain pending external actions are reconciled rather than reissued. Preserve this directory across restarts and upgrades. Independent cloud checkouts without shared durable state are not suitable for this local runner.

Before dispatch, the runner compares each referenced instruction and configuration resource against the bytes committed at HEAD. It fails for missing tools or missing explicit channel, trusted triage identity, tracker, control, feature map or draft-only configuration. An absent/deleted root thread produces no dispatch. Repro only accepts exactly one configured marker from the trusted user in the exact source thread. An existing fix dispatches verification mode. The operational instruction still owns ownership checks, two real UI reproductions, evidence checks, bounded edits and draft-PR gates. Runner completion is not proof those business checks passed; adapter execution must supply their evidence.

## Adapter contract

The user-owned ES module exports a default object:

| Method | Contract |
| --- | --- |
| `capabilities()` | Confirm booleans `slackRead`, `slackThreadReply`, `trackerReadWrite`, `attachments`, `control`, `draftPullRequest` from actual bound tools, not desired permissions. |
| `poll(channel)` | Return reports `{ channel, ts, thread_ts? }`; enumerate the configured channel including unprocessed reports after downtime. Slack coordinates remain strings. |
| `readThread(channel, thread_ts)` | Return message objects `{ channel, ts?, thread_ts?, user?, text? }`, including the actual parent. No missing-thread fabricated parent. |
| `existingFix(channel, thread_ts)` | Search repository/tracker evidence and return an existing fix reference or null. A reference routes to verification, not authoring. |
| `dispatch(request)` | Run the full committed instruction with `id`, immutable `channel`/`thread_ts`, configuration path and mode. Only coordinator may post; workers receive neither Slack credentials nor posting tools. Return `{ completed: true }` only when the instruction's outcome is recorded. |
| `recover(id)` | Reconcile a pending operation with external evidence. Return `completed`, `no-effect`, or `unknown`. `no-effect` must prove no reply/ticket/PR was written. `unknown` blocks further writes for this report. |

These method and field names are this executable's contract, not claims about official Slack or host APIs. The adapter must implement tracker dedupe, external operation ID reconciliation and compensation required by the upstream workflow. If its tools cannot determine a previous write's outcome, keep `unknown`; never retry a ticket or reply blindly. Do not pass credentials, source posting instructions or write tools to child agents. Prompt bans alone do not establish actual tool isolation.

## Codex

[Official scheduled-task documentation](https://learn.chatgpt.com/docs/automations?surface=app), read 2026-10-14, supports project-scoped scheduled tasks. The project must remain on disk, the machine powered on and desktop app running. Run against the local project holding durable state rather than a fresh worktree. Actual event-trigger eligibility depends on account/workspace permissions; this implementation uses periodic polling, not an asserted Slack event subscription.

After an authorized dedicated-channel test, create the schedule through current host schedule tools, bind the project and command above, and read back the saved repository, paths and tool availability. No schedule was created during adaptation. Desktop application control must be available in that scheduled run, not only in the interactive session.

## Claude Code

[Official scheduling comparison](https://code.claude.com/docs/en/scheduled-tasks), read 2026-10-14: Desktop scheduled tasks run locally; `/loop` is tied to a running session and has documented resume/expiry limitations. Use Desktop scheduling for persistent local polling, or `/loop` only for a supervised test. Read back the chosen host's actual task before enabling.

[Official Routines documentation](https://code.claude.com/docs/en/routines) provides cloud scheduling, API and GitHub event triggers and configured account connectors. CLI-local MCP servers are not cloud connectors. No direct Slack-trigger capability is assumed here. Cloud runs cannot use this runner's local state or desktop control automatically; do not deploy this local pack as a cloud Routine unless durable state and the actual control/tool environment are independently supplied and tested.

## Verification and configuration choices

Run `node --test <actual-installed-pstack-host>/benny-tools/test-benny.mjs` for isolated mocks. It checks pack upgrade/local conflict, trusted markers, reply filtering, duplicate polling, restart recovery, existing fixes and missing-tool rejection. Then require explicit authorization and a dedicated test channel/project to check real scheduled execution, thread replies, tracker compensation and actual reproduction. Simulated dispatch does not verify any of those services.

New path choice `.pstack/benny-user/` can be changed: paths are supplied through existing configuration fields. `.pstack/benny-state/` and its event identity cannot be removed without losing restart/dedupe guarantees. The source SHA and managed-file hash record cannot be removed without losing safe upgrade ownership checks. Adapter method names are required by this runner; no extra interval or permission settings were introduced. Existing upstream budgets remain in the YAML reference; runner cadence is owned by the selected host schedule.
