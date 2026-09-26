---
name: origin-api
description: >-
  Routes questions about the Cursor Origin API to the right section of the
  Origin docs and names the few rules to check first. Use when a task mentions
  Origin, the Origin API, Origin Apps, or Origin webhooks, including creating
  an Origin App, authenticating as one, calling Origin endpoints, or handling
  Origin webhook deliveries.
license: MIT
compatibility: >-
  Needs network access to https://cursor.com/docs/api/origin/* at run time.
---

# Origin API

The docs are the source of truth. This skill says where to look and which
rules to check first; it does not restate the docs.

## Fetch first

Do not name an endpoint, scope, event slug, header, or limit from memory.

All paths below are under `https://cursor.com/docs/api/origin/`.

- `llms.txt`: the index. Every section, endpoint, and webhook payload has its
  own page at `reference/<anchor>.md`, and the index links to each.
- `openapi.yaml`: the contract. Its `x-origin-*` extensions are summarized in
  `reference/endpoint-reference.md`.
- `llms-full.txt`: every reference page in one file. `changelog`: what moved.

For one question, read `llms.txt`, then fetch the one `reference/<anchor>.md`
that answers it. Fetch the whole `llms-full.txt` or `openapi.yaml` only for
broad work, such as a porting brief.

Cite `operationId`s and reference pages. Where this file and the docs
disagree, the docs win.

## Where to look

| Question | Page |
| --- | --- |
| Which credential for which call; minting and lifetime | `reference/authentication.md` and its subsections through `reference/git-https-authentication.md` |
| Install flow and the callback receipt | `reference/installation.md`, `reference/installation-receipt.md` |
| Which scope an operation needs | `x-origin-scopes` on the operation; `reference/scopes.md` |
| What an installation can do on a mirrored repository | `reference/mirrored-repositories.md` |
| Webhook headers, signature, envelope, retries, pausing, recovery | `reference/webhooks.md` |
| Which events exist and which arrive without subscribing | `reference/events.md` |
| Payload shapes | `reference/event-payloads.md` |
| Pagination, errors, request IDs, repository paths | `reference/common-conventions.md` |
| ID form and stability | `reference/ids.md` |
| What a `PREVIEW` badge means | `reference/preview.md` |
| Rate limits | `reference/rate-limits.md` |
| Check-run keys, attempts, stale writes | `reference/check-runs.md` |
| What is not there yet | `reference/current-limitations.md` |
| A checklist to build against | `reference/implementation-checklist.md` |

## Rules to check first

1. **Native or mirror.** Confirm the target repositories are Origin-native
   or stable outbound mirrors. On any other mirror state an installation can
   only read, and pushes are not delivered (`reference/mirrored-repositories.md`,
   `reference/events.md`).
2. **Subscribe.** Only the `installation.*` events arrive without a
   subscription; a missing subscription is silence, not an error (`reference/events.md`).
3. **Verify, dedupe, acknowledge.** Verify the signature over the raw body
   before parsing, dedupe on the delivery ID, return `2xx`, then process
   (`reference/signature-verification.md`, `reference/retries.md`, `reference/automatic-disable.md`). The digest
   step differs from the Standard Webhooks spec; do not assume a generic
   verifier passes.
4. **Scopes from the spec.** Request the union of `x-origin-scopes.scopes`
   over the operations the app calls (`reference/scopes.md`).
5. **Opaque tokens and IDs.** Do not build or parse page tokens or IDs
   (`reference/pagination.md`, `reference/ids.md`).

Porting an existing GitHub App: the `port-github-app-to-origin` skill in
this plugin covers how its capabilities map onto Origin.
