---
name: osb-coordination
description: Opt-in shared ownership checkpoints for PStack through an operator-provisioned OSB authority. Use only when the project explicitly enables the extension.
---

# Shared ownership for an opted-in project

Keep PStack's existing `orch` TSV/JSON store, one writer per local file and named stacker. This extension does not replace verification, scheduling or landing policy. Read [the contract](references/contract.md) before service calls. Without an enabled project config, use ordinary PStack; do not install, enroll or grant access automatically.

An operator supplies a private fixed authenticated route, approved immutable repository/scope binding, current authority/member identity and a separate durable journal for each coordinator. OSB is independently maintained; do not copy its reference lab into a live authority or start competing ledgers. The optional implemented mapping is `osb-firstmate.coord.project.v2`; another backend needs a reviewed mapping, not guessed operation names.

Use `python3 scripts/osb.py --config /private/project-osb.json --request /private/request.json` from this skill directory. Mutations need a stable `request_id` written in the request file before invocation. On uncertain response, reuse identical bytes/key. Journal conflicts or unavailable authority block the opted-in action. Never treat a local row or replayed receipt as live authority.

Before dispatching a shared writer, enroll its own home/session explicitly, submit its scoped intent, then claim it. A new session invalidates prior home claims; it is not routine resume. At worker checkpoints use live `check`/`renew`. Before a cooperative publication checkpoint, publish the exact head and call `checkpoint` with the current claim/intent and exact submitted base/head. The helper checks service ownership and revision, but executes no effect and offers no atomic fence around a subsequent Git/CI/merge command. Existing repository guards and permission remain required.

Record refusal as blocked in PStack's local unit/inbox; do not mark it verified or finished. Keep evidence keyed to actual head as PStack already requires. Release only the current authenticated holder's exact claim/fence after owned work is quiescent. Do not delete worktrees or foreign resources based on missing local inventory. Generic completion and named atomic task handoff are unsupported; a successor has its own intent and must obtain a fresh claim. Primary/stacker transfer and merge authorization remain separate operator decisions.

For one operator-enabled fixed local verifier and the existing PStack verdict record, use [the protected local path](references/local-verifier.md). It claims before launch, renews during work, checks revisions/live ownership before recording, and releases after its own process groups are quiescent. It is not native Cursor Task interception or an atomic external effect fence. Preserve uncertain attempts for explicit reconciliation.

No heartbeat daemon, live setup, automatic leader election, CI dispatch, merge, deployment or foreign cleanup is provided. [Validation](references/validation.md) distinguishes client fixture behavior, supplied real authority, mock orchestration and actual harness acceptance. All new source fixtures are unexecuted at proposal publication.
