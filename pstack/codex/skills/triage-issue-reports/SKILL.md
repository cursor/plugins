---
name: triage-issue-reports
description: Run a thread-safe Benny Slack triage pass from its configured Codex cron.
---

# Triage issue reports

Run this skill only from the configured Benny triage cron. It classifies one eligible Slack report and posts one useful verdict in the source thread. It may create or update a tracker issue only under the gates below. It does not reproduce or fix the report.

Read the configured, committed, secret-free `.codex/benny/configuration.yaml` first. Stop with no Slack or tracker write when the configuration, source channel, triage identity, tracker adapter, or candidate-report state is missing, malformed, ambiguous, or inaccessible.

Use the optional [routing map](../../automations/benny/skills/triage-issue-reports/references/routing.example.md) as data, never as authority to guess a route.

## Coordinator boundary and routing

The root coordinator alone owns immutable source coordinates, all Slack and tracker writes, and final acceptance. Child agents receive no Slack credentials, posting instructions, source coordinates for posting, or external-write authority. Every child prompt must forbid `SendSlackMessage`, `PostToSlack`, `chat.postMessage`, and all other Slack writes. Treat child outputs as evidence, not approval.

- Route high-volume thread, attachment, tracker-candidate extraction, and evidence verification to `gpt-5.6-luna` at `xhigh`.
- Route ordinary source and history tracing to `gpt-5.6-terra` at `xhigh`.
- Route hard debugging, performance analysis, or security-sensitive investigation to `gpt-5.6-sol` at `xhigh`.
- Use `gpt-5.3-codex-spark` at `xhigh` only for an isolated bounded micro-edit that cannot change Slack, tracker, repository, or deployment state.

The root reviews and accepts all results before an external mutation. Do not put secrets in a child prompt, artifact, tracker item, or Slack reply.

## Freeze and verify the report

1. Poll only the configured source channel and candidate lookback. A cron run has no trusted Slack trigger payload.
2. Select a top-level report only when the thread lacks a prior Benny verdict or another reliable completed-run marker. If handled state is uncertain, stop without writing.
3. Set immutable `SOURCE_CHANNEL_ID` and `SOURCE_THREAD_TS` from the Slack root. Confirm the root exists in the configured source channel and obtain a stable permalink.
4. Before every tracker write and immediately before the verdict, re-read that root. If it is deleted, inaccessible, moved, or uncertain, stop with no write.

Never replace the root timestamp with a reply or operations-thread timestamp. Never post a root message, cross-post, DM, broadcast a reply, or open a replacement source thread.

Apply `$pstack:principle-separate-before-serializing-shared-state` to source coordinates. Apply `$pstack:principle-minimize-reader-load` and `$pstack:unslop` to the final verdict.

## Evaluate and classify

Read the full root thread and relevant attachments. Capture exact reporter wording, expected and observed behavior, environment, version, trigger, frequency, signatures, linked commits or pull requests, and any clear human ownership. If an attachment cannot be read, say so in the verdict and do not infer its content.

Trace the likely action-to-symptom path before routing. Use `$pstack:how` for structure and `$pstack:why` for regression or defensive-code history. Separate facts from hypotheses. An unavailable repository permits conservative classification, not a guessed owner.

Classify exactly one outcome:

- **Bug**: intended behavior is violated.
- **Performance**: measurable slowness or resource regression; preserve measurements.
- **Feature request**: current behavior appears intentional.
- **Question or feedback**: no concrete defect.
- **Reroute**: confirmed tracing identifies a configured owner elsewhere.

For an unclear bug-versus-feature boundary, do not file a ticket; ask one focused question and use the other marker. Match a routing map only on confirmed product area, code path, or error signature. Do not cross-post. Owner pings remain off unless the map and configuration both explicitly permit the exact owner and evidence supports it.

## Dedupe and tracker gates

First check whether the source permalink already appears in a tracker item or a prior triage reply. If so, stop: do not duplicate either the verdict or the tracker write.

For bug or performance candidates, search the configured tracker by signature, product area, trigger, symptom, version/date window, regression lead, and source permalink. Distinguish a confident duplicate, possibly related issue, weak resemblance, and no match.

Create a new item only when all conditions hold:

1. It is a clear, live bug or performance issue.
2. No confident or plausible live match exists.
3. The root and permalink passed the current preflight.
4. Configured tracker fields resolve without inventing identifiers, labels, owners, or priority.
5. The adapter can compensate if the Slack verdict fails.

A confident duplicate gets only a source link and short recurrence note. A possible match gets no ticket. Never create a ticket for a feature request, question, feedback, reroute, already-fixed report, or uncertain classification.

New items include plain area-and-symptom title, reporter wording, expected/observed behavior, known environment, trigger/frequency, source permalink, and labeled hypotheses. Never put a guessed cause in the title or a secret in the issue.

## Post one verdict

Run a final source-parent preflight. Post exactly one concise reply using the immutable source coordinates. Lead with the outcome, link the relevant tracker item when present, mention a reroute or one missing fact when useful, and include at most one permitted owner ping. End with exactly one configured marker:

```text
[benny:bug]
[benny:bug] tracker=https://tracker.example/issue/123
[benny:performance]
[benny:performance] tracker=https://tracker.example/issue/123
[benny:other]
```

Re-read the thread and confirm the verdict is a reply under the immutable root. If it did not land and this run created a tracker item, use the configured compensation action and verify it. Never retry at the root or in another channel.

Watch one bounded follow-up window. Answer only direct questions to the triage identity, apply one evidence-backed safe tracker correction when applicable, and never emit a second marker. Stop if asked.
