# Origin-isms: GitHub features that map differently on Origin

Check here before calling anything a gap. Each row says whether a documented
Origin path exists (`maps`) or nothing in the current spec covers it
(`not-available`), and where the Origin answer lives (a page under
`https://cursor.com/docs/api/origin/` unless noted). A `maps` row is a question only if the team
wants the old shape back. A `not-available` row is a question, and feedback
if it meets the bar in `gap-bar.md`. Read the source; do not copy this table
into the brief.

| What the app uses today | Mark | Where the Origin answer lives |
| --- | --- | --- |
| Writes or `push` events on a repository mirrored from GitHub | `maps` | Read-only until the mirror becomes a stable outbound mirror (`reference/mirrored-repositories.md`); pushes are not delivered for GitHub-sourced mirrors (`reference/events.md`). Transitioning is a user-credential operation. First question of every brief. |
| Install callback query parameters (`installation_id`, `setup_action`) | `maps` | `reference/installation-receipt.md` |
| RS256 app JWT | `maps` | `reference/app-jwt.md` |
| Long-lived installation tokens | `maps` | `reference/installation-access-token.md` |
| User OAuth, `/user`, `/user/installations`, install-by-user picker | `not-available` | No user-credential flow for apps in the current spec. Repository discovery is through the installation; namespace-wide listing is under `reference/current-limitations.md`. Ask what the flow should do. |
| Permissions `<noun>: read\|write` | `maps` | `reference/scopes.md`; `x-origin-scopes` per operation |
| Numeric IDs, `/repositories/{id}` | `maps` | `reference/ids.md`, `reference/repository-paths.md` |
| `Link` / `page` / `per_page` pagination, total counts | `maps` | `reference/pagination.md` |
| GraphQL | `not-available` | No GraphQL endpoint in the current spec. Decompose into REST calls and count the fan-out; a decomposition that meets the feedback bar earns an entry about that read. |
| Commit statuses (`statuses` permission, `POST /statuses/{sha}`) | `maps` | `reference/check-runs.md` (check runs with a stable `key`) |
| Issues (`issues` permission, `issues.*` events, `/issues/{n}` not on a pull request) | `not-available` | No Issues endpoints or events in the current spec. Pull request comments, threads, reviews, and labels cover the pull-request half. Ask what the team needs for the rest; an issue-driven app may earn a feedback entry. |
| `/issues/{n}/comments`, `/issues/{n}/labels` used on a pull request | `maps` | Pull requests endpoint reference; same calls under `/pulls/{n}/…` |
| Repository webhook CRUD (`/repos/…/hooks`) | `maps` | Subscriptions are set per app through Create App / Update App `events` (`reference/events.md`). |
| App-manifest conversion | `maps` | App creation form or `CreateApp` (`reference/installation.md`, endpoint reference) |
| OAuth-app token mints | `not-available` | Nothing in the current spec. Ask what the flow was for. |
| Git Data API commit and ref writes | `maps` | Create Commit From Files, Create Git Ref (Git data endpoint reference); `reference/git-https-authentication.md` for pushes |
| Git Data API arbitrary blob or tree writes | `not-available` | Not in the current spec. Ask whether commit-from-files or a push covers the use. |
| Standalone review-thread objects | `maps` | A thread comes from its first diff-anchored comment (Pull requests endpoint reference); thread listing is under `reference/current-limitations.md`. |
| User, email, team, and member lookups | `not-available` | No directory reads in the current spec. Reviewer identifiers resolve by public id, user email, or group slug; `handle` is present when the profile is public (`reference/resource-references.md`). |
| Single `pull_request` event with an `action` field, `previous_attributes` | `maps` | `reference/events.md`, `reference/event-payloads.md` |
| `x-github-*` headers, HMAC `x-hub-signature-256` | `maps` | `reference/headers.md`, `reference/signature-verification.md` |
| Payload inlines (changed files on push, before-SHA, `html_url`, `sender` profile) | `maps` | `reference/resource-references.md`; the push commit list is under `reference/current-limitations.md` and may change. Name the follow-up call per field and count the fan-out. |
| All events delivered after app creation | `maps` | `reference/events.md` |
| Reviews keyed by `commit_id` | `maps` | `pullRequestVersion` on the review schema |
| Finding own check runs or comments by actor | `maps` | `reference/check-runs.md` (`key`); comments and reviews by a marker the app controls |
| Requested-reviewer team pages, `created_via` | `not-available` | Groups exist and resolve by slug; there is no group membership read in the current spec. |

A capability that is not on this list and that the Origin docs do not
mention is not available today; ask the team whether they need it.
