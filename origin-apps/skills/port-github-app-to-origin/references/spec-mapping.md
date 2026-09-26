# Reading the Origin spec and matching GitHub calls and events to it

Paths like `reference/<anchor>.md` are under `https://cursor.com/docs/api/origin/`.

Every mapping in the brief comes from the fetched `openapi.yaml`, not from a
table here. Build the index once. Every later step looks things up in it.

## Extensions the spec carries

| Extension | Where | Use |
| --- | --- | --- |
| `x-origin-scopes` | every operation | The scope and credential rules for that operation. `reference/scopes.md`, `reference/endpoint-reference.md`. |
| `x-origin-webhook-events` | payload schemas | The slugs that deliver this payload shape; a schema carrying it is a webhook family. `reference/event-payloads.md`. Infer the embedded resource from its `$ref`s; some families have no REST twin. |
| `x-cursor-visibility: PREVIEW` | operations, parameters, schemas, fields | `reference/preview.md`. Note it in the brief on any capability that touches a badged element. |

## Build the index

1. **Operations and scopes**: `rg -B1 -A4 'x-origin-scopes:' openapi.yaml`
   prints every `operationId` with its scope block. From it, note the union
   of scopes with the operations that need each, and separate
   installation-requestable scopes from ambient and user-only ones
   (`reference/scopes.md` explains the difference). The user-only set tells
   you which GitHub flows have no app-side equivalent. Read parameters and
   response components from the spec when a rule below asks for them.
2. **Webhook events**: `rg -A3 'x-origin-webhook-events:' openapi.yaml` lists
   every slug with its payload schema. Each family has its own page with the
   fields expanded to dotted paths (`reference/pull-request-events.md`; find
   the page in `llms.txt`). In a broad run with `llms-full.txt` already
   fetched, `rg -n '^### Pull Request Events$' llms-full.txt` and read to the
   next `###`. From `reference/events.md`, note which slugs are delivered
   without a subscription and which must be selected.
3. **Resources**: each endpoint's page lists its "Response Fields" with nested
   objects expanded (`reference/get-pull-request.md`), for "does the Origin
   object carry this field". Fallback in a broad run:
   `rg -n '^### Get Pull Request$' llms-full.txt`.

## Matching

Try these in order and stop at the first rule that yields a confirmed
counterpart. Confirmed means you read the Origin operation's description and
parameters and it answers the same question the current call answers. A name
match is a candidate, not a result.

**REST calls**

1. Look for the same resource path under the Origin base path
   (`reference/repository-paths.md` and `reference/ids.md` give the path forms). Most GitHub
   repository, pull request, check, label, branch, and commit paths have a
   direct or near-direct counterpart.
2. Re-home GitHub's issue-flavored pull request calls (`/issues/{n}/comments`,
   `/issues/{n}/labels` used *on a pull request*) to the pull request
   endpoints. That is a path change, not a gap. When the code uses them on
   real issues, see `origin-isms.md`.
3. Re-home app and installation calls (`/app`, `/app/installations`,
   access-token minting, `/installation/repositories`) to the Apps and
   installations endpoints and confirm the credential each accepts. `/user`,
   `/user/installations`, `/orgs/…`, `/search/…`, and `/repositories/{id}`
   have no path counterpart. Consult `origin-isms.md` before labeling them.
4. Compare parameters as well as paths. A matching path that lacks a filter
   the code depends on is a workaround or a gap, not a straight match.
5. Compare the response fields the code reads. Each missing field gets its
   own line as follow-up call, derivable, or absent. GitHub inlines web URLs,
   nested profiles, and counts that Origin does not.

**GraphQL.** There is no endpoint. Decompose each document into the REST
reads and writes it stands for, map those, and record the fan-out as the
row's tradeoff.

**Permissions → scopes.** Do not translate the manifest noun-for-noun. Find
the operations the code calls and take the union of *their*
`x-origin-scopes.scopes`. GitHub permissions with no Origin noun
(`statuses`, `issues`, `members`, `organization_*`, `pages`, `actions`,
`workflows`, `deployments`) go through `origin-isms.md` first.

**Events → slugs.** Each GitHub `event` + `action` pair maps to at most one
slug in `reference/events.md`; the action is part of the slug. A pair with
no slug is not an event on Origin. Check whether the state change is
observable another way before classifying it.

**Payload fields → schema properties.** For each field path a handler reads,
walk the mapped family's "Payload Fields" list on its reference page and record
one of five outcomes, matching the brief template's "How" column.
Present at `<path>`. Present in the envelope (`event.type` carries what
GitHub puts in `action`). Follow-up read via `<operationId>` with identifiers
the payload carries. Derivable from present fields, saying how and whether
the format is contractual. Absent, which goes to the gap bar. A field on the REST
component that the webhook twin lacks means a follow-up `Get…` on every
event.

## Out of domain and spec-silent

- A concept neither the spec nor the reference pages mention is not available
  today and gets a question rather than a gap: there is no Origin answer yet
  to compare against, and the question is how the team tells Cursor they
  need it.
- A behavior the code depends on that the docs do not state (does an event
  fire for a draft pull request? does `updatedAt` move on a comment?) becomes an open
  question plus a hello-world step that observes it on a native repository.
  Do not settle it from GitHub's behavior.
