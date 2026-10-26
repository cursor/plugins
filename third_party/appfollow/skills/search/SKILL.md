---
name: search
description: >
  Find an app on the App Store / Google Play and start tracking it in AppFollow, then hand structured
  app references to the feedback-analysis and aso-analysis skills. Read-only search + dedupe works on any
  plan; the add step degrades gracefully when the plan does not allow writes. Trigger on "find app X",
  "track our app", "add <app> to AppFollow".
---

# search — find + track apps

Read `using-appfollow` first (session opening, write ritual, error codes).

## Inputs

- `query`: app name (free-text search keywords).
- `store`: the short store code — `as` (App Store) or `gp` (Google Play) for the search; `add_app`
  takes all ten codes (`using-appfollow` → `references/tool-map.md`).
- `country` (default `us`), `collection` (name; created if new), `locale`.

## Flow

0. **Session:** `whoami` (see `using-appfollow`).
1. **Normalize input.** Search takes free-text keywords only — the ASO search endpoints do not accept
   a store URL or an `ext_id`. Trim the query to the app name (strip any pasted URL down to the app
   name/title before searching).
2. **Search (read-only, any plan).** Call `aso_search_results` (optionally `aso_search_suggestions`,
   12 cr). Present numbered candidates. Auto-pick only a single exact-title match; otherwise the user
   picks.
3. **Resolve collection.** `list_collections`. If the target collection is new, run
   `add_collection_preview` → user approval → `add_collection`.
4. **Dedupe (read-only).** `list_apps` (`apps_id` = the target collection's `collectionId`); if the
   app's `extId` is already there, record it under `skipped_existing` and skip the add. `list_apps`
   reports `store` as the long name (`itunes` = `as`, `googleplay` = `gp`).
5. **Add (write — may be plan-gated).** `add_app_preview` → **explicit user approval** → `add_app`
   with identical args: `store` (short code), `ext_id`, `apps_id`, `locale` (two-letter country code).
   Pass `is_competitor: true` only when the user says the app is a rival (default: one of their own).
6. **Verify.** `list_apps` again; confirm the app's `extId` now appears; keep the collection's
   `apps_id` with it — the report skills address the app by `apps_id` + `ext_id`.
7. **Emit** the JSON block (below).

## Read-only degrade path (plan-gated writes)

`add_collection` requires an **Advanced API / Custom** plan; neither it nor `add_app` carries a
**feature gate** — so a plan block does **not** arrive as `FEATURE_DISABLED`. It can surface as
`ACCESS_DENIED`, `VALIDATION_ERROR` (on `add_app`, a full apps or competitors limit), or
`UPSTREAM_ERROR`. Therefore:

- Always complete search + dedupe (read-only — works on any plan).
- Attempt the `add_*` confirm.
- On **any** error code from the add, **do not** assert a specific code. Report the candidate refs you
  found, state plainly that the add could not be completed (likely a plan limitation), and list the
  found refs under `not_added` so the report skills can still target them (they may already be tracked).

## Output (fenced JSON)

```json
{
  "added": [{"store": "as", "ext_id": "389801252", "apps_id": 12345, "collection": "Core apps", "locale": "us", "title": "Example App"}],
  "skipped_existing": [],
  "not_added": [],
  "collection_created": null,
  "credits_spent_estimate": 13
}
```
