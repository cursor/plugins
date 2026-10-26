---
name: feedback-analysis
description: >
  Analyze app or collection feedback over a window — KPIs with prev-window deltas, rating/volume/
  sentiment trends, anomaly callouts, and ranked top bugs + feature requests — then emit a structured
  findings.json plus a self-contained HTML report. Read-only (never writes). Trigger on "feedback
  report", "how are our reviews", "what are users complaining about", "review trends for <app>",
  "what are our testers saying" (Google Play testing feedback).
---

# feedback-analysis

Read `using-appfollow` first. This skill is **read-only** — it never calls a write pair.

## Inputs

- **scope:** an app (`ext_id`+`store`), a whole collection, or a **user-chosen subset of apps from one
  collection** (e.g. "just these 3 apps from my <collection>"). Spanning **multiple** collections in one
  report is not supported yet (deferred).
- **window:** default last 30 days; comparison = the preceding equal period.
- **country / lang** (optional).
- **depth:** `quick` | `standard` | `deep` = `get_reviews` page caps 2 / 5 / 10 per pull. A
  whole-collection pull gets the cap once; app and subset pulls apply it per app. **Default `deep`.**
  `quick`/`standard` only on an explicit user request.
- **testing feedback** (optional, Google Play only): what testers left on a closed or open testing
  track — a separate review set, **off by default**; pulled only on an explicit user request (Gather
  step D).

## Two tiers, runtime-probed

Read the advertised tool list; pick the plan (toolkit and MCP release trains are decoupled):

- **Tier A (always):** `whoami`, `list_collections`, `list_apps`, `get_reviews`,
  `get_ratings_history`.
- **Tier B (degrade if the probe shows it absent):** `reviews_semantic`, `get_reviews_summary`,
  `get_reviews_ai_summary`.
- **Degradable, app-level (not a probe-gated tier):** `get_gp_console_ratings` — see Gather step B for
  the degrade rule.

## Gather

0. **Session** (`using-appfollow`).
A. **Scope resolve.** Collection lookup is **mandatory even for a bare ext_id** — `get_reviews`,
   `get_reviews_summary` and `get_gp_console_ratings` take the collection's `apps_id` (`collectionId` in
   `list_collections`), and `get_reviews_ai_summary` takes its `collection_name` (`collectionCode`) +
   `store`. `list_apps` (`apps_id`) gives each app's `extId` (the `ext_id` argument) and reports `store`
   as the long name — map it to the short code before any `store` argument (`using-appfollow` →
   `references/tool-map.md`). A whole collection means its own apps (`isCompetitor: false` in
   `list_apps`): run every per-app call below on those only. For a subset scope: resolve the collection
   via `list_collections`, list its apps via `list_apps`, then gather data for only the chosen subset —
   emit `scope.type: "collection_subset"` with `collection_name` set and `apps` = the chosen subset (not
   the full collection).
B. **Cheap aggregates first.** Per app, one `get_ratings_history` spanning both windows (`ext_id` +
   short `store`, `period=daily`, `type=total`, one `country` — the user's, else `all`): the full series
   comes back in one call, no paging; split client-side. `get_reviews_summary` once for the current
   window (Tier B) on step C's scope (`apps_id`, plus `ext_id` where step C pulls per app): its
   `total.value`, `previous` and `diff` cover the current and the preceding equal period, and
   `total.value` sizes step C — review pages carry no total. `get_gp_console_ratings` (`apps_id` + each
   Google Play app's `ext_id` + the report-window `from` + `to`, `fields: ["ratings"]`) is degradable —
   the app may have no Google Play Console connection, or the feature may be unavailable server-side. On
   any error (`FEATURE_DISABLED`, `VALIDATION_ERROR`, `UNKNOWN_TOOL`, or other), or an empty response,
   omit the GP-console rating signal, note the gap in the report, and continue; the App Store
   rating-history path is unaffected. Never fail the whole analysis on this call.
C. **Narrative.** Per app, `get_reviews_ai_summary` with the report-window `from` + `to`, the app's
   `ext_id`, the collection's `collection_name` (`collectionCode`) and short `store` (skip on any error:
   without the AI summary feature it answers `FEATURE_DISABLED` or `ACCESS_DENIED`).
   `reviews_semantic` — client-side classification is the first-class fallback. Then `get_reviews` raw
   pages: a whole collection is **one** pull (`apps_id`, no `ext_id` — its own apps; the collection's
   competitor apps are left out), an app or a subset one pull per app (`apps_id` + `ext_id`). Page by
   passing each `nextCursor` back as `cursor` (same arguments) up to the depth cap; stop early when
   `nextCursor` is null or absent; record coverage % against step B's total (`references/method.md`).
D. **Testing feedback (opt-in, Google Play).** A **separate review set**: for a Google Play app,
   `get_reviews` returns only public reviews unless `testing_feedback: true`, and then only testing
   feedback (`typeList: ["beta"]`) — never both in one call, and never merged into the public-review
   sections. Run it only on an explicit user request for tester / beta / testing-track feedback: a
   separate `get_reviews` pass per Google Play app, each call with the collection's `apps_id`, that
   app's `ext_id` and `testing_feedback: true` over the report window, same paging and depth cap as
   step C. Other stores ignore the flag and always return their public reviews: skip them, never send
   a workspace-wide `true` call, and keep only reviews whose `typeList` contains `beta`. When
   `get_reviews` does not list `testing_feedback` among its arguments, skip the step and note it — a
   server without the flag returns public reviews. An empty set is a result, not an error — no testing
   feedback in the window, or no Google Play Console connection to AppFollow, and the tool does not say
   which: report it as empty, do not retry. If the user asked only for tester feedback, run steps 0, A
   and D, skip B and C, and emit the testing section alone. Analyze it apart from the public set
   (`references/method.md`).

## Analyze

Follow `references/method.md`: KPIs + deltas; daily-avg + 7-day-rolling trends; the anomaly heuristics
with their explicit thresholds; bug/feature mining (semantic-first, client-side classification the
default fallback). Apply **coverage gating** — demote text-derived findings below the 60% floor to
"indicative only". Ratings-derived findings are never coverage-gated. Group rollup weights by
each app's rating count (`starsTotal` of its latest `get_ratings_history` row) and merges cross-app
clusters into `affected_apps`.

## Error rails (`using-appfollow`)

`INSUFFICIENT_CREDITS` → stop, emit a **partial** report + coverage note. `RATE_LIMITED` → one backoff
then continue. `NETWORK_ERROR`/`UPSTREAM_ERROR` on a non-critical call → skip that section, keep going.
Missing Tier-B tool → documented fallback. Never fail the whole report on one tool error.

## Emit

Write `./appfollow-reports/<report_id>/`:

1. **`findings.json`** — `appfollow.toolkit.findings/v1`, `report_type:"feedback"`. Validate it against
   `schemas/findings.schema.json` before writing. Each finding: stable `id`, `type`, `title`,
   `description`, `severity`, `priority_hint`, `affected_apps`, `metrics`, `evidence` (3–5 quotes
   ≤200 chars via review ids — no permalink scheme exists), `suggested_labels`, stable `dedup_key`
   (so re-runs update rather than duplicate), `status:"proposed"`.
2. **`report.html`** — fill `references/report-template.html`; inline SVG charts; no external requests.
3. **`report.md`** — the same content in Markdown.

On Claude Code, also publish the HTML artifact; on Codex, write the files and state their path.

## Findings hand-off

Tell the user their own connected tracker agent can file `findings.json` into their tracker — the
toolkit never talks to a tracker.
