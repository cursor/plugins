---
name: phonic-improvement-loop
description: Run Phonic prompt experiments and conversation simulations with Replay or Responses. Use to debug a conversation, compare prompt changes, or simulate tool-dependent behavior.
license: MIT
---

# Phonic prompt experiments and simulations

Use Replay and Responses to investigate a conversation or compare a proposed prompt change. Read the [Replay API](https://docs.phonic.ai/api-reference/conversation-items/replay.md) or [Responses API](https://docs.phonic.ai/api-reference/responses/create.md) for the selected method.

## Scope the experiment

Identify the behavior being changed, the affected conversations and tool paths, and the consequence of a regression. Match the experiment to that scope:

- **One conversation or a small wording change:** inspect the failure, replay the relevant completed assistant turns, and check a few related cases. A mock server or formal dataset split is unnecessary for a local diagnosis.
- **Broader prompt or tool-use changes:** compare the baseline and candidate on representative conversations, including ordinary cases, known failures, and affected tool paths. For repeated prompt development, separate train (development), validation (candidate selection), and test (final assessment) sets. Keep related conversation turns and synthetic variants in the same split.
- **High-volume or consequential deployments:** consider simulations with varied tool outputs, failures, and rare cases. A mock tool server is useful when tool behavior materially affects the result; scale, tool complexity, and failure impact matter more than an enterprise label. Read [mock-tool simulations](references/mock-tools.md) only when this larger experiment is warranted.

Choose sample counts and a stopping condition from the user's objective, coverage, cost, and available time. Respect a supplied budget; otherwise propose the size and estimated generation count before a substantial batch. There is no fixed iteration limit. Define what a successful reply or tool call looks like before comparing results.

## Choose Replay or Responses

- **Replay:** use `replay_conversation_item` when exposed, or `POST /v1/conversation_items/{id}/replay`, for a completed assistant turn from an ended, transcript-retained conversation. Omit `system_prompt` for the as-recorded baseline; supply it for the candidate. Whole-conversation audio replay is a different operation.
- **Responses:** use the discovered `create_response` tool or `POST /v1/responses` for synthetic or edited histories, alternate tool outputs, and multi-turn simulations. Workspace enablement may be required. Read [Responses simulation requests](references/responses.md) when using this method.

## Run and compare

Keep inputs, configuration, sample counts, and grading criteria consistent between baseline and candidate. Inspect generated text, proposed tool calls, and actions together; check tool names and arguments rather than judging plausible speech alone. A proposed tool call does not prove an external action executed. Text simulations do not measure voice quality, interruptions, or live latency.

For a local experiment, report what the related cases establish and their limits. For broader experiments, develop changes on train cases, select using validation, and assess the chosen prompt on untouched test cases. If test results guide a further edit, use a new test set before making a final generalization claim. If grading criteria change, regrade baseline and candidate consistently.

Stop when the target is met, the agreed resource limit is reached, or further experiments are not justified by the evidence. Separate failed Replay or Responses API requests from poor generated replies and deliberately simulated tool errors. Report attempted, successful, and failed requests, sample sizes, representative failures, and total generations; do not silently drop missing samples. Fix access/eligibility errors before retrying, and bound transient retries within the experiment's resource limit.

Return the proposed prompt diff and concise experiment results, including regressions and uncertainty. Raw outputs may contain conversation data and tool configuration; do not commit them by default. Updating a saved agent must be within the user's authorized task.
