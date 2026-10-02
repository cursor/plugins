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

The docs are the source of truth. Do not name an endpoint, scope, event slug,
header, or limit from memory. Where this file and the docs disagree, the docs
win.

The docs live under `https://cursor.com/docs/api/origin/`. `llms.txt` is
the index and links every section, endpoint, and webhook payload.
`openapi.yaml` is the contract, and "Endpoint reference" explains its
`x-origin-*` extensions. `llms-full.txt` is the whole reference in one file.
`changelog` says what moved. For one question, start at `llms.txt` and
fetch only the section that answers it. `llms-full.txt` and `openapi.yaml`
are each several hundred kilobytes, too large to read into context whole.
When you need all of them, as a porting brief does, save them locally if you
can, outside any repository you are working in, search them for the section
heading or annotation you need, and read only the matching part. Cite
`operationId`s and section names.

## Rules to check first

1. **Native or mirror.** A repository is either native (created on Origin)
   or a GitHub mirror. On a native repository an installation has its full
   scopes and every write. On a GitHub mirror, every event except
   `repository.pushed` still arrives, every call beyond metadata and
   contents reads returns `403`, and merging a pull request or changing the
   default branch is not available ("Mirrored repositories", "Events").
2. **Subscribe.** Only `installation.*` events arrive without a subscription.
   A missing subscription produces silence, not an error ("Events").
3. **Verify, dedupe, acknowledge.** Verify the signature over the raw body
   before parsing, dedupe on the delivery ID, return `2xx`, then process
   ("Signature verification", "Retries", "Automatic disable"). Origin signs
   a digest, which Standard Webhooks does not, so a generic verifier fails.
4. **Scopes from the spec.** Request the union of `x-origin-scopes.scopes`
   over the operations the app calls ("Scopes").
5. **Opaque tokens and IDs.** Do not build or parse page tokens or IDs
   ("Pagination", "IDs").

One section name the index does not make obvious: what happens to a
check-run post that arrives out of order is under "Ordering writes".

Porting an existing GitHub App: use `port-github-app-to-origin` in this
plugin.
