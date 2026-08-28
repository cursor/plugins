---
name: reproduce-and-fix-issues
description: Reproduce a triaged Benny report through the real UI and prove one bounded draft fix.
---

# Reproduce and fix issues

Run this skill only from the configured Benny reproduce cron. It waits for a trusted triage verdict, reproduces the exact discriminating symptom twice through the real UI, verifies existing fixes, and may prepare one bounded draft pull request after before-and-after proof.

Read the configured, committed, secret-free `.codex/benny/configuration.yaml` before work. Stop with no external write when the configuration, source channel, root coordinates, trusted triage identity, tracker access, control adapter, completed feature map, or candidate-report state is missing, malformed, ambiguous, or inaccessible.

Read the [control-adapter contract](../../automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md), the completed feature map, and, when needed, [existing-fix verification](../../automations/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md).

## Coordinator boundary and routing

The root coordinator alone owns immutable source coordinates, Slack and tracker writes, commits, pull-request creation, and final acceptance. Child agents receive no Slack credentials, posting instructions, source coordinates for posting, or external-write authority. Every child prompt must forbid `SendSlackMessage`, `PostToSlack`, `chat.postMessage`, and all other Slack writes. Treat each child result as evidence, not approval.

- Route high-volume report/attachment extraction, code-history extraction, media review, and baseline-versus-patched evidence verification to `gpt-5.6-luna` at `xhigh`.
- Route ordinary root-cause analysis and bounded implementation to `gpt-5.6-terra` at `xhigh`.
- Route hard debugging, performance analysis, and security-sensitive reasoning to `gpt-5.6-sol` at `xhigh`.
- Route only an isolated bounded micro-edit to `gpt-5.3-codex-spark` at `xhigh`.

Children are read-only unless the root proves their environment excludes Slack credentials and every external-write tool. The root reviews and accepts every result before an external mutation. Never put secrets in child prompts, evidence, logs, captures, commits, or pull-request text.

Use `$pstack:principle-guard-the-context-window` for delegated analysis. Apply `$pstack:principle-sequence-verifiable-units`, `$pstack:principle-fix-root-causes`, and `$pstack:principle-prove-it-works` through reproduction, implementation, and verification.

## Freeze source and wait for a verdict

1. Poll only the configured source channel and candidate lookback. A cron run has no trusted Slack trigger payload.
2. Select a top-level candidate only when it has not been handled by this workflow; if historical state is uncertain, stop without writing.
3. Derive immutable `SOURCE_CHANNEL_ID` and `SOURCE_THREAD_TS` from the Slack root, confirm the root exists in the configured source channel, and obtain a stable permalink.
4. Re-read the thread. Accept exactly one configured marker only when it is a reply under the immutable root and its author is the configured triage identity.
5. Proceed only for `bug` or `performance`. Stop silently for `other`, a missing/conflicting/untrusted verdict, or a timeout.

Before any source reply, re-read the immutable root and confirm it still exists in the source channel. Never post a root message or retry in a fallback channel.

## Ownership and existing-fix gates

Stop when a person clearly claims the fix, gives a concrete implementation plan, or assigns someone to implement, patch, fix, or open a pull request. A utility bot's summary, evidence lookup, diagnosis, or hypothesis is not fix ownership.

If an open pull request or merged commit plausibly addresses the report, enter verification mode. Do not edit it, author a competing patch, or open a replacement pull request. Verification requires the symptom twice on the baseline and absent twice on the patched real UI; compilation or tests alone are not proof.

## Check the UI environment and reproduce

Require all control-adapter capabilities: start the target app/test environment, navigate the mapped user path and states, drive the real UI, inspect state without mutation, capture screenshots, record the screen, and clean up. If any capability is absent, mark the run blocked in the optional operations thread or run output and stop. Do not call unit tests, source inspection, state injection, or screenshots a UI reproduction.

Read the full thread, tracker item, and feature-map section. Collect exact actions, expected/observed behavior, discriminating state, frequency, version/environment/platform, attachments/signatures, and candidate code area. Use `$pstack:how` for runtime flow and `$pstack:why` for historical intent.

Through real UI actions, establish the expected final state and broken final state. Reach their divergence, observe the broken state, reset enough state to make the next attempt independent, then reproduce it again. Cross-check a real read-only state value when possible. The configured repro budget bounds this work.

For a confirmed repro, record the full path, capture the broken state, and save exact steps in the configured temporary artifact directory. Have an evidence reviewer answer whether the final state visibly discriminates the defect. If it does not, improve evidence or report `Could not reproduce`; no authored fix follows an uncertain repro. Always clean up adapter-created processes, profiles, and temporary data without deleting user work.

## Report the outcome

Use an optional operations thread for detailed status if configured; it is the only permitted root post in this workflow. Keep operations and source coordinates separate.

For `Could not reproduce` or `Blocked`, make no unprompted source reply. For a confirmed repro, post at most one concise source-thread reply after preflight: state that it reproduced, link operations evidence/tracker when present, include at most three findings, and do not ping an owner by default. Wait through the configured rejection window; correct the repro once for a concrete invalidation, otherwise do not fix until that window expires.

## Qualify, implement, and prove a bounded fix

Attempt a fix only when all of the following hold: a plain confirmed repro; reviewer-confirmed evidence; no existing fix artifact; no human owner after the rejection window; runtime evidence identifies the root cause; the change fits the configured repository/risk budget; and the adapter can run both baseline and patched builds.

Use `$pstack:tdd` when there is a cheap local test target; otherwise state why it is not appropriate. Confirm the mechanism, eliminate competing causes, and make the smallest root-cause change. Stop when risk or effort exceeds the approved budget.

Keep baseline evidence. On the patched build, run the same real UI path twice, prove the broken state is gone and the expected state appears, capture an after recording and screenshot, and repeat the same read-only cross-check. Run focused tests and smoke nearby affected states, inputs, permissions, platforms, and failure paths. A compile, unit test, code review, or plausible diff is never sufficient after evidence.

Only after proof, review the final diff for unrelated changes and secrets, run required checks, create ordered commits when the repository permits, and open a draft pull request. Never merge or deploy. Include repro steps, root cause, tests, before/after evidence, and blast-radius checks. If creation fails, do not claim success; retain branch details only in the run output. Post the draft link in the operations thread, not as another unprompted source reply.

Watch one bounded operations follow-up window, answer only direct evidence-backed questions, and apply no more than one correction/repro cycle. Stop when asked and retain artifacts only for the configured retention period.
