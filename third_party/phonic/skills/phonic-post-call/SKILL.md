---
name: phonic-post-call
description: Handle Phonic conversation webhooks, extractions, and evaluations. Use for post-call processing, analysis results, and webhook receivers.
license: MIT
---

# Process Phonic conversation results

SDKs: `npm install phonic` / `pip install phonic`. Entry points: `new PhonicClient({ apiKey })` (Node), `Phonic(api_key=...)` / `AsyncPhonic(...)` (Python). REST base: `https://api.phonic.ai/v1` with `Authorization: Bearer $PHONIC_API_KEY`. Always use the `.ai` domain for API and docs URLs — `phonic.co` addresses still resolve for backward compatibility, but all new code should use `phonic.ai`.

Fetch live docs rather than from memory: use the index at [llms.txt](https://docs.phonic.ai/llms.txt). For the REST API, see [openapi.json](https://docs.phonic.ai/openapi.json). For the WebSocket protocol, see [asyncapi.json](https://docs.phonic.ai/asyncapi.json). If an endpoint does not appear in these docs, it doesn't exist, do not invent one.

## Webhooks and post-call steps

Webhooks can indicate conversation progress: `conversation.ended`, `conversation.analysis`, `conversation.transferred`. A typical post-call pipeline looks like:

1. **`conversation.ended`** fires when the call ends — log the outcome and kick off your downstream steps from here.
2. **`conversation.analysis`** follows with performance metrics: its `conversation` payload carries `latencies_ms` and `interruptions_count` (also available via `GET /v1/conversations/{id}/analysis`). It does not contain extraction results.
3. **Extractions** turn the transcript into typed fields you define. Create an extraction schema, then run it per conversation with `POST /v1/conversations/{id}/extractions` and read results with the matching GET — typically from your `conversation.ended` handler. Extractions read the transcript, so they fail if transcripts are deleted; run them promptly if you have a retention policy.
4. **Eval prompts** grade calls against plain-language criteria. Create them at the project level (`name` + a criterion like "the assistant made the required disclosure"), evaluate a conversation via the conversation-evals endpoint, and read results per conversation or listed across the project — useful for compliance checks and QA queues.

## Webhook receivers

- **Webhook receivers** — Phonic delivers webhooks via svix, which retries, so the same event can arrive more than once (and concurrently). Build for that:
  1. Verify the svix signature before touching the body.
  2. Durably enqueue the event before returning 2xx; process slow work with a retryable worker.
  3. Store each event id durably (DB unique constraint, not process memory) and skip events you've already processed.
  4. For external side effects, use a stable idempotency key supported by the destination and persist the result. A crash after a side effect but before marking it complete can otherwise duplicate it on retry. A local started/done marker alone does not guarantee exactly-once execution; reconcile ambiguous outcomes before retrying non-idempotent operations.
