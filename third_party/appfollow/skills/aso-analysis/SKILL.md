---
name: aso-analysis
description: >
  ASO performance for an app or collection — tracked-keyword positions and (gate-iv-gated) trends,
  category-rank trend, keyword opportunities with competitor context, an interactive add-keyword loop
  (the only write path), and honest metadata suggestions. Emits a structured findings.json plus a
  self-contained HTML report. Trigger on "ASO report", "keyword rankings", "keyword opportunities",
  "how do we rank for <keyword>", "suggest keywords to add".
---

# aso-analysis

Read `using-appfollow` first (session, write ritual, error codes).

## Inputs

- **scope:** app, whole collection, or a **user-chosen subset of apps from one collection** (e.g. "just
  these 3 apps from my <collection>"). For a subset: resolve the collection via `list_collections`, list
  its apps via `list_apps`, then gather ASO data for only the chosen apps — emit `scope.type:
  "collection_subset"` with `collection_name` set and `apps` = the chosen subset (not the full
  collection). Spanning **multiple** collections in one report is not supported yet (deferred).
- **countries:** default 1 primary.
- **devices:** App Store → `iphone`, `ipad`; Google Play → `android`.
- **keyword seeds** (optional).

## Default depth

Estimate ≈ `A×C×D×[S×P×12 (list_keywords) + S×12 (get_rankings)] + A×C×[K_seed×12 (suggestions) +
K_serp×12 (search)] + A(as)×12 (search_ads) + A×12 (aso report, optional)`. **Default = `deep`:** max
`S=4` trend sample-dates (today / −7d / −14d / −28d), max `K_serp=10`. A single app/country/device at
`deep` with one keyword page and 10 seed suggestions ≈ **360 cr** (with full trend sampling and the ASO
report). `quick`/`standard` only on explicit user request (degrade `S` 4→2, `K_serp` 10→5).

## Trend section — verify-gated (smoke gate iv)

The trend features (per-sample-date keyword positions and category rank over `S = today, −7d, −14d,
−28d`) depend on `list_keywords` / `get_rankings` with `date=<past>` returning a **true historical
snapshot**. This is gated on smoke gate iv. **Build the trend section only if gate iv passed.** If it
did not, ship **current-snapshot-only** (buckets TOP3 / TOP10 / TOP30 / TOP100 / UNRANKED,
effectiveness tiers, competitor gaps); the HTML/method footer states plainly that trend-over-time is
unavailable pending a historical endpoint. **Never** re-read today's data under a past-date label.

## Add-keyword loop (the ONLY write path)

1. Propose a table of ≤15 candidate keywords; the user **explicitly selects** (never auto-add).
2. `edit_keywords` **REPLACES** the tracked keyword set for `(apps_id, country, device)` — any keyword
   not in the CSV is dropped. Never send only the new candidates.
3. Per `(country, device)`: read the current set with `list_keywords({ext_id, country, device})`
   **without `date`** (today), paging until exhausted. Read it fresh before each preview, even if an
   earlier read exists: after any `edit_keywords` on the same `(apps_id, country, device)` the old
   read is stale and would drop what that edit added. Current set = every tracked keyword in the
   response, ranked AND unranked (`no_pos`) — dropping the unranked ones deletes them on REPLACE. Any
   page fails → stop, no write.
4. CSV = current set ∪ selected (dedupe, case-insensitive).
   `edit_keywords_preview({country, device, keywords CSV, apps_id})` — **always pass `apps_id`
   explicitly** (omitting it defaults to the account's first collection — a wrong-collection hazard).
   A size refusal (`VALIDATION_ERROR` naming a byte limit) → stop and tell the user. Never split the
   set across calls (each call replaces the set; only the last chunk would survive) and never trim
   current keywords to fit unless the user names which to drop (then list them as dropped).
5. Show what the call replaces: collection, current keywords kept (count), added list, dropped = none.
   `list_keywords` reads by `ext_id` and does not say which collection it read. Check
   `list_collections` + `list_apps`: if the app sits in more than one collection, the current set may
   belong to another collection — do not claim dropped = none; say so, and write only on the user's
   explicit acceptance (otherwise stop). Get approval.
6. Before `edit_keywords`, re-read `list_keywords` as in step 3 (no upstream revision check exists).
   If the set changed since step 3, go back to step 4 (rebuild, re-preview, re-approve). Then
   `edit_keywords` with verbatim args + the token. On `CONFIRMATION_REQUIRED` → re-preview.
7. `edit_keywords` is a Keywords-Edit action (not Advanced-gated), so this works on Keywords-Edit plans.
   Positions appear next parse cycle; offer an optional live SERP spot-check of ≤3 keywords. Applied
   batches → findings `status:"applied"`.

## Metadata optimization — honest read ladder (suggestions only; no metadata write exists)

Most-reliable last:

1. `get_app_metadata` — **only if the session advertises it** (probe). Treat as an unverified
   passthrough until confirmed.
2. Own SERP card via `aso_search_results` (title / subtitle / genre; no description) — also unverified.
3. **User paste — the only reliable current-metadata source today.** The App Store keyword field is
   developer-private: always pasted or skipped.

Output per field: CURRENT → SUGGESTED + keywords gained/lost + rationale + localization risk + "apply
in App Store Connect / Play Console."

## Keyword effectiveness tiers (print the real definitions verbatim in the footer)

Tier every tracked keyword by the real `list_keywords.effectiveness` field only — **WORTH IT**
(`effectiveness > 20`) vs **SKIP** (`effectiveness <= 20`); sort by effectiveness descending within
each tier. `effectiveness` (0–100) is AppFollow's Keyword Effectiveness Index weighing popularity
against competition; above 20 is worth putting in the app title/subtitle (see the support article
below).

Show `popularity` and `difficulty` as **informational context columns only** — they never drive the
tier:

- **Popularity** (0–100): search-traffic score. Scale is exponential/non-linear; AppFollow doesn't
  recommend keywords scoring below ~20.
- **Difficulty** (0–100): how hard the keyword is to rank Top-10 for. Higher = tougher.

There is **no public composite formula**. Effectiveness, popularity, and difficulty are
AppFollow-computed values surfaced as-is from `list_keywords` — state this plainly in the report.
Link the reader to the support article for what each score means:
https://support.appfollow.io/hc/en-us/articles/360020831817-Keyword-Tracking.

`list_keywords.score` (usually null, an undocumented secondary "AF score") is shown as a secondary
display value only and **never** feeds the tier. Every finding carries `expected_impact{metric,
direction, magnitude, confidence, basis:"effectiveness-v1"}` and reproducible
`evidence[]{source:"mcp:<tool>", args, observed, at}`.

## Optional tools

`aso_featured_apps` is HOLD until its `ext_id` schema fix lands (expect `VALIDATION_ERROR` before then —
mark the section n/a). `get_aso_report_app_store` / `get_aso_report_gdc_google_play` are optional; on any
error mark the section "n/a".

## Emit

Write `aso-analysis-<scope>-<date>.html` (fill `references/report-template.html`) + `findings.json`
(`appfollow.toolkit.findings/v1`, `report_type:"aso"`; validate against `schemas/findings.schema.json`
before writing). On Claude Code publish the artifact; on Codex write the files and state the path. Tell
the user their own connected agent can file the findings into their tracker.
