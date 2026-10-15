# The brief and the feedback

## The brief

Write one Markdown file at the repository root (`ORIGIN-PORTING-BRIEF.md`
unless the team names files differently) and print its path. Aim for about
800 words for a small app and about 2,000 for a large one. Leave out any part
that has nothing to say. Pick whatever table shape fits the app. A good brief:

- Opens with a summary. The verdict (ports as is, ports with workarounds, or
  blocked on X), the question that decides the rest (usually whether the
  repositories are native or mirrored), and whether there is feedback for
  Cursor and if any of it blocks the port.
- Lists only the capabilities that do not carry over as is. For each, the
  Origin operation, event slug, or docs section it maps to, or a note that
  nothing does. Closes the list with one line for the rest, such as "14
  operations map directly; see the scopes line". Shows a webhook payload
  field only when it is missing or needs an extra API call. Ends with the
  scopes to request.
- Describes an end-to-end test for this app when that helps. Which events to
  select, how to check the repository's mirror state, the first event that
  should arrive and what it should contain, the first write. Skip generic
  setup; the docs' "Implementation checklist" covers it.
- Says what makes the port big or small and how to roll it out (run both
  versions side by side, or cut over). No time estimates.
- Asks only the questions the team has to decide. Do not turn a finding into
  a question.
- Ends with two lines saying which spec version (`info.version` and fetch
  time) and which code commit the brief is based on, then Feedback for
  Cursor as the last section, without a number.

Back every claim about the app with `file:line`, or with "from
`<dependency>`" when a library does it for the app. Back every claim about
Origin with something in the saved docs. If you want short labels in a
table, use plain ones: works as is, workaround (say the cost), not available
(ask the team), gap (write feedback).

## Feedback for Cursor

Cursor wants to hear what the team needs. Raise anything that blocks the
team's main flow, costs them correctness, security, or scale, or that they
would like Origin to do. The tests below only sort items into feedback (a
capability Origin should add) and questions (decisions the team must make).
They never decide whether to speak up.

A workaround gets the same result another way, for example an extra read, a
different identifier, a changed path, filtering on the client, or a marker
the app controls. Often it is the right answer. It becomes a gap, and gets a
feedback entry, when it costs one of these:

- fan-out, meaning extra calls per event, that grows with repository or
  activity size at this app's volume;
- a possibly wrong answer, such as guessing which check run or comment is the
  app's own, inferring a pull request from a SHA that several versions
  share, or building a URL whose format the docs do not promise;
- a broader scope, a longer-lived token, or a user credential where an
  installation token should be enough;
- a change to what the team's users see or can do;
- a capability the app's main flow or its first end-to-end test depends on.

A state change the app exists to react to, with no event for it and no other
way to notice it, is also a gap. Something the docs never mention is not
available today and gets a question; it becomes feedback only if it blocks
the main flow.

Not feedback, only a question or a note: a field or filter the code does not
use; a convention that differs but has a mechanical substitute; a documented
design choice such as token lifetime or no GraphQL.

Write one entry per gap, in Origin terms, with nothing that reveals the
team's internals. When there is at least one entry, also write the section
to `ORIGIN-FEEDBACK.md` next to the brief. When there is none, write no file
and say so in one line. The file carries no license header, repository name,
product name, or mention of another forge. If the docs and observed
behavior disagree, put that in a short "Docs questions for Cursor" list at
the end of the feedback, not in the team's questions. A suggested shape:

```markdown
### Feedback: <capability, in Origin terms>
- **Use case:** the app needs to <do what, for whom>, <how often or at what volume>.
- **Origin today:** <what is missing or costly; cite the closest operationId, slug, or section, or "no operation">.
- **Workaround considered:** <the route and the cost that makes it insufficient, or "none found">.
- **Blocking?** yes / no, for which flow.
- **Spec version checked:** <info.version>, <date>.
```

Describe the capability. Do not propose scope, field, or route names. The
team sends the feedback, not you, and they remove anything that reveals
their internals first.

## Where GitHub features live on Origin

Check this before calling anything a gap, then confirm in the saved docs.
This list goes stale; the docs win.

Has an Origin equivalent: install callback parameters → "Installation
receipt"; RS256 app JWT → "App JWT"; long-lived installation tokens →
"Installation access token"; permissions → "Scopes" and `x-origin-scopes`;
numeric IDs and `/repositories/{id}` → "IDs", "Repository paths"; `Link`
pagination and total counts → "Pagination"; commit statuses → check runs
with a stable `key` ("Check runs"); `/issues/{n}/comments` and
`/issues/{n}/labels` on a pull request → the pull request endpoints;
repository webhook CRUD → the app's `events` list on Create App and Update
App; one `pull_request` event with an `action` field → one slug per action
("Events"); `x-github-*` headers and HMAC signatures → "Headers", "Signature
verification"; data GitHub inlines in payloads (changed files, before-SHA,
URLs, user profiles) → extra reads ("Resource references", "Current
limitations"); reviews keyed by commit SHA → `pullRequestVersion`; finding
the app's own check runs or comments by author → the check run `key`, or a
marker the app controls; user sign-in and acting as a user → "Acting on
behalf of users" (user confirmation receipt, installation user tokens).

GitHub mirrors: an installation can only read metadata and contents, and
merging a pull request or changing the default branch is not available.
Every write needs a native repository, one created on Origin ("Mirrored
repositories").

Not in the current spec (ask the team; feedback only if it blocks the main
flow): GraphQL (break each query into REST calls); Issues (pull request
comments, threads, reviews, and labels cover the pull request half);
OAuth-app token minting; writing arbitrary blobs or trees (commit-from-files
and pushes exist); looking up users, emails, teams, or members (reviewer
identifiers resolve by public id, email, or group slug); reading group
membership or a user's effective permission. For those last two, the
workaround to name is a user token limited to a repository and scopes.
Minting it returns `403` unless the user holds that permission, so it
doubles as a permission check.
