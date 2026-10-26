---
name: competitors
description: >
  Find an app's real competitors in one region on one or both platforms, add the chosen ones to
  tracking, and build a competitive audit — share of search across live store results, newly
  discovered competitors, category position, and 30-day rating velocity with a star breakdown.
  Emits a structured findings.json plus a self-contained HTML report. Trigger on "who are our
  competitors", "competitor analysis", "competitive audit", "who outranks us in this country",
  "compare us against a named rival", "add competitors to tracking", "/competitors".
---

# competitors

Read `using-appfollow` first (session opening, write ritual, error codes).

This skill answers one question — *who are we actually competing with in this market, and how do we
stand against them* — using only data the MCP can produce. Everything below was verified against the
live API; the constraints in **Verified limits** are not hypothetical and must not be designed around
optimistically.

## Inputs

Collected interactively in step 1. Nothing is assumed.

- **app** — name, store URL, or `ext_id`. A store URL is fine: parse the id out of it (`/id<digits>` for
  App Store, `?id=<package>` for Google Play). The ASO search endpoints take free-text terms only, never
  a URL or an id.
- **platforms** — `ios`, `android`, or both. Maps to `store` + `device`: iOS → `as` + `iphone`,
  Android → `gp` + `android`.
- **region** — exactly **one** two-letter country code. The skill does not proceed with several.
  One region is a hard requirement, not a default: results differ enough between markets that a
  blended answer is meaningless.

## Flow

### 0. Session

`whoami` (see `using-appfollow`).

### 1. Scope

Ask for app, platforms and region in one turn. Offer sensible defaults the user can accept in a word,
but do not guess the region — require it.

Then state plainly, before starting:

- Which platforms will run (each platform is an independent sweep and doubles the work).
- That the audit needs the target app **tracked in the account**; competitor discovery does not.

### 2. Resolve the target app

`list_collections` → `list_apps` (`apps_id` = each collection's `collectionId`) until the app's `extId`
is found. Record `ext_id`, `store` (`list_apps` gives the long name — map it to the short code:
`itunes` = `as`, `googleplay` = `gp`), and the collection `apps_id`.

- **Found** → continue.
- **Not found** → discovery (step 3) still works, because the store-search endpoints are not
  account-scoped. Say so, run discovery, and offer to add the target app itself in step 5. The audit
  sections that need tracking are marked unavailable until it is added.

If the requested region is not among the collection's `countries` (each entry's `name`) in
`list_collections`, say so — it does not block anything (the region is passed per call), but the
account may hold less data for that market; 6.4 falls back as described there.

### 3. Discovery sweep (the engine of this skill)

Per platform, in the chosen country:

1. **Seed the term set.** `aso_search_suggestions` on the app's brand name plus 3–5 category
   generics in the market's own language. Use what the store returns, never your own translation —
   suggestions frequently name competitors inside the suggestion strings, which is signal you get without
   having to ask for it.
2. **Pick 8 terms**: 5 category generics + the app's own brand + 2 rival brand terms. Fewer than 6 makes
   share of search noise; more than 10 rarely changes the ranking of candidates.
3. **Sweep.** `aso_search_results(term, country, device)`. Each response is the full
   ranked list with `ext_id`, `title`, `artist_name`, `rating_avg`, `genre`/`genre_id`.

Keep every response: steps 3, 4 and audit sections 1–3 all read from this one sweep. Do not re-fetch.

### 4. Selection

Rank candidates by appearances across the sweep first, average position second. Present **the top 3 per
platform** with, for each: appearances (`n/8`), best and average position, publisher, store rating.

Then give the user a free-text field to name their own competitors instead of or in addition to yours.
Resolve each typed name with one `aso_search_results` call and confirm which app you matched
before adding anything.

**The per-platform lists will not be brand-symmetric, and that is correct.** Verified: Just Eat is one
`ext_id` on the App Store but two separate packages on Google Play (`com.justeat.app.es` and
`com.justeat.app.uk`), both ranking in the same Spanish results. Match by market, never by brand — a
head-to-head between a Spanish app and a British one is a wrong answer that looks right.

### 5. Add to tracking (the only write path)

For each selected competitor, per platform: `add_app_preview` → show exactly what will be written →
**explicit approval for that app** → `add_app` with identical args + token. The args are `store` (short
code), `ext_id`, `apps_id` (the target's collection; when the target is not tracked yet, ask which
collection), `locale` (the region) and `is_competitor: true` — without it the rival is tracked as one
of the user's own apps. The target app itself, when added here, keeps the default
`is_competitor: false`.

Confirm each app individually, not the batch. Two reasons:

- **Each competitor takes a competitor slot.** An app added with `is_competitor: true` counts against
  the plan's competitor limit, which is separate from the limit on the user's own apps; a full limit
  refuses the add. State this plainly, **without a number**: no endpoint reports either limit, so
  "N of M used" is impossible, and `list_collections`' per-collection `countApps` (own apps) and
  `countCompetitors` are usage, not capacity. Say that the account's remaining capacity is visible only
  in the dashboard.
- **There is no remove tool anywhere in the MCP.** An app added by mistake keeps its slot until someone
  deletes it in the AppFollow dashboard. Say this before the first write, not after.

After the writes, call `list_apps` again and confirm each added `extId` is listed with the intended
`isCompetitor`. `list_apps` does not report the country an app was stored under, and a request with
`locale: es` was stored as `country: gb` — never claim the requested locale is what was saved; the
stored country shows in the AppFollow dashboard.

`add_app` carries no feature gate, so a plan block never arrives as `FEATURE_DISABLED`: a full apps or
competitors limit comes back as `VALIDATION_ERROR`, and other refusals can carry other codes. On any
error, do not name a specific cause: report that the add could not be completed, likely a plan
limitation, and continue with whatever is already tracked.

### 6. Audit

Five sections, in this order. Two of them are available the moment a competitor is added; one needs a
parse cycle. Say which is which in the report rather than printing empty tables.

#### 6.1 Share of search

Computed from the step-3 sweep, no extra calls. Per app across the term set:

- **coverage** — in how many of the N terms the app appears at all
- **average position** where present
- **top-3 rate** — share of terms where it sits at position ≤ 3

Rank the target and all competitors in one table. This is **unweighted**: every term counts the same,
because no popularity score is used. Label it that way in the report — do not imply traffic weighting.

#### 6.2 Newly discovered competitors

Diff the `ext_id`s seen in the sweep against everything in `list_apps`. Output the apps that outrank the
target on its own terms and are not tracked, with appearances and best position. No extra requests — the
data is already in hand. End with an offer to add them (step 5 ritual applies).

This is the section that repeatedly produces the surprise. Verified examples: a generic Opera "Local
News" app at #4 on a query the customer thought they owned; iFood (a Brazilian app) at #4 on two Spanish
generics on Google Play.

#### 6.3 Category position

`get_rankings(ext_id, country, device)` per app. Report `genre_id`, `feed_type`, `pos`, and
the row `date`.

- **Flag category mismatches.** Take the genre from the sweep's SERP card (`genre`, `genre_id`) or from
  `list_apps`. When a competitor sits in a different category than the target, say so explicitly and
  note that the two are ranking in different pools, so the positions are not comparable. Verified real
  case: Glovo is in Lifestyle (6012) while its direct rivals are in Food & Drink (6023).
- **An empty list usually means "not charting", not "not ready".** `get_rankings` returns positions for
  apps added moments earlier — verified: two competitors added during a run both returned a rank dated
  the previous day, while the target app, tracked since 2023, returned an empty list. So the default
  reading of an empty result is that the app does not appear in that country's category chart at the
  depth the store exposes. Report it as **not charting**, next to the rivals' positions, because that
  contrast is the finding.
- **Only hedge when freshness is genuinely in play.** If an app was added in this run *and* its rank is
  empty *and* the other apps in the same call also came back empty, the cause may be a parse cycle
  rather than the chart. Say the data may need time to collect, give an approximate date, and include
  the exact command to re-run — but never present a pending note when other apps in the same batch
  returned positions.

#### 6.4 Average rating, last 30 days

`get_ratings_history(ext_id, store, from, to, country, period, type)` per app — no collection lookup:
the app is its `ext_id` + short `store` code, the market is `country`.

- `type: "diff"` — incremental, not cumulative. This is the whole point of the section: the cumulative
  average barely moves (observed 4.706 → 4.704 over a month) while the incremental average swings
  meaningfully (4.617 → 4.673 across eight weeks on the same app).
- **`diff` is App Store only.** `store: "gp"` with `type: "diff"` is refused before any call
  (`VALIDATION_ERROR`, nothing billed). On Android, call `type: "total"` and report the cumulative
  average and rating count, labelled cumulative; the new-ratings read (the incremental average here
  and all of 6.5) is unavailable there — say so rather than deriving one.
- In `diff` mode, a row's `value` is the mean of the **new** ratings in that period. Verified by
  arithmetic: `(108·1 + 13·2 + 66·3 + 220·4 + 1996·5) / 2403 = 4.658`, matching the returned value
  to three decimals.
- `country` takes **exactly one** code (default `all`, worldwide), so loop one country per call; each
  call is priced on its own. A single code does filter correctly — verified by control (`es` and `us`
  returned different numbers for the same app). If a single-country call fails or comes back empty
  for an app, report that region as unavailable for it and offer `country: "all"`, clearly labelled
  as worldwide, not region-specific.
- `period: "weekly"` gives the shape as well as the total. The final row is often a partial period of one
  or two days — exclude it from sums and report it separately.
- **This works on day one.** Ratings history is backfilled on add: an app added the previous day
  returned eight full weeks of history.

#### 6.5 New ratings with star breakdown, last 30 days

Same call as 6.4, no extra request — App Store only (6.4). Report per app: total new ratings
(`starsTotal`) and the split from `stars` (`stars1`…`stars5`, each with `count` and `percent`), both as
counts and as shares.

Lead with the share of negatives (1–2★), not the total. Volume differences are usually just scale;
the share is what says whether the inflow is healthier or worse. Verified illustration: one app took
5.7× more new ratings than a rival, but their negative shares were 5.2% and 5.0% — the interesting fact
was that relative to installed base the *smaller* app was collecting ratings faster.

Where the numbers support it, add the base-relative read: new ratings over the window divided by the
app's cumulative rating count. It reverses naive conclusions often enough to be worth the two lines of
arithmetic — but it is **App Store only**: `rating_cnt` comes from the sweep's SERP card, and Google Play
rows carry `rating_avg` without it. On Android, say the read is unavailable rather than substituting
a different denominator.

**Watch for inorganic bursts before drawing any conclusion.** A real run produced weekly volumes of
4, 1, 1, then 158 in one week (155 of them 5★), then 159 ratings in three days of which *all 159* were
exactly 2★. Uniform single-value blocks after near-zero volume are not organic. When the shape looks
like that, flag it as needing verification and refuse to summarise the app's rating health from it —
reporting a 97.6% five-star share off such a series would be worse than reporting nothing.

### 7. Emit

Write `competitors-<app-slug>-<country>-<date>.html` from `references/report-template.html`, plus
`findings.json` under `appfollow.toolkit.findings/v1` with `report_type: "competitors"`. On Claude Code,
publish the HTML as an artifact; on Codex, write the files and state the paths. Tell the user their own
connected tracker agent can file the findings.

**`scope` keeps the shape the shared schema already defines** — `type: "app"` with `apps` holding the
single target, exactly as `schemas/findings.schema.json` describes it. Competitors go in their own
top-level `competitors` block, never inside `scope.apps`: the enum has no value for a target-plus-rivals
report, and smuggling rivals into `apps` would contradict that field's own description. Extending the
enum is a separate contract change, not this skill's business.

```json
{
  "report_type": "competitors",
  "scope": { "type": "app", "apps": [ { "store": "gp", "ext_id": "...", "title": "...", "country": "us", "device": "android" } ] },
  "competitors": [ { "store": "gp", "ext_id": "...", "title": "...", "tracked_before_run": false } ]
}
```

Every finding carries `evidence[]{source:"mcp:<tool>", args, observed, at}` so any number in the report
can be traced back to the call that produced it.

## Verified limits

State these when they bite; never promise around them.

| Limit | Consequence |
|---|---|
| Untracked apps are refused: `get_reviews` answers `NOT_FOUND` for an `ext_id` that is not in the collection `apps_id` (before any data call), `list_keywords` and `get_ratings_history` answer `ACCESS_DENIED` | Discovery works on any app; every audit section except 6.1 and 6.2 needs the app tracked |
| No remove tool exists | Adds are irreversible from the agent; slots stay consumed |
| No slot-limit endpoint; competitors have a limit of their own, and `list_collections`' `countApps` / `countCompetitors` are usage, not capacity | Warn about slots without a number; the real figure is dashboard-only |
| `add_app` has no feature gate; a full apps or competitors limit refuses the add | A block surfaces as `VALIDATION_ERROR` or another code that is not `FEATURE_DISABLED` — do not attribute a cause |
| Stored country can differ from the requested `locale`, and `list_apps` does not report it | Never claim the requested `locale` landed; the dashboard shows the stored country |
| An empty `get_rankings` list normally means the app is not in that country's chart — apps added minutes earlier returned positions, a 3-year-tracked app returned nothing | Report "not charting"; hedge on freshness only when the whole batch came back empty |
| `get_ratings_history` refuses `type: "diff"` for `gp` (`VALIDATION_ERROR`, before any call) | The incremental average and new-ratings split (6.4–6.5) are App Store only; Android gets the cumulative series |
| `get_ratings_history` takes one `country` per call (default `all`, worldwide), each call priced on its own | Loop countries one per call; label an `all` series as worldwide |
| Google Play returns `rating_avg: 0` for the #1 row on an exact brand-name query | Never read a rating from a brand-term row; take it from a generic term or from ratings history |
| Google Play search rows carry no `rating_cnt` | The base-relative read in 6.5 is App Store only |
| App Store SERP enriches only ~the first 12 rows; deeper rows are bare `ext_id` | On iOS, "not in the top N" is a claim about the named window only. Google Play returns full rows throughout, so Android discovery is more reliable |
| Same brand ≠ same app across stores and markets | Match by market; one store may have one id where the other has one package per country |

## Out of scope

Do not offer these — no data source exists in the MCP:

- **Installs, downloads, MAU, revenue, market share.** The stored ASO reports are integration-gated and
  fail with `ASO Report Integration Not Found` on accounts without them; there is no other source.
- **Competitor metadata beyond the SERP card.** Title, subtitle and genre are available; descriptions and
  the App Store keyword field are not.
- **Keyword-level head-to-head.** Deliberately excluded from this skill: it needs the account to already
  track keywords for that exact (country, device) pair — empty in 3 of 5 markets checked — and a parse
  cycle before a newly added competitor is scored.
- **Apple Search Ads as a competitor's targeting list.** `aso_search_ads_recommendations` returned an
  empty `keywords` array for every app tried, including the account's own.

## Degrade path

A section never fails the run. Skip it, name it in the report with the error code verbatim, keep going:

- Store search fails for a term → drop that term, recompute share of search over the remaining set, and
  say the denominator changed.
- `get_rankings` empty → pending-with-date, per 6.3.
- `get_ratings_history` fails for one app → report the others and mark that app's rows unavailable.
- One platform fails entirely → ship the other platform's report rather than nothing.
