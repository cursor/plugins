# feedback-analysis — analysis method

## KPIs & deltas

Compute for the window and the preceding equal period: average rating, rating count, review volume,
reply coverage, and the sentiment split. Report the delta vs the prior window for each.

## Trend series (ratings-derived — complete, never coverage-gated)

From one `get_ratings_history` call per app spanning both windows (`period=daily`, `type=total`, one
`country`; the full daily series comes back in one call — no paging, no `limit`), compute the
daily-average trend and a 7-day rolling average. Split client-side into the two windows.

## Anomaly heuristics (explicit thresholds — print them in the report footer)

- **Rating drop:** 7-day-avg down 0.3 over 14 days, OR a single-day drop of 0.5 with ≥20 ratings.
- **Volume spike:** daily volume greater than `max(10, 3 × trailing-7-day median)`.
- **Negative-share spike:** negative share up 10 percentage points AND above `mean + 2σ`.
- **Review-bombing:** 1-star share above 50% of daily volume for ≥2 consecutive days.
- **Reply-coverage drop:** reply coverage down 15 percentage points.

## Bug / feature mining

Semantic-first when `reviews_semantic` is available; otherwise **client-side classification of
`get_reviews` text is the default fallback** (most plans lack semantic).
Cluster into top bugs and top feature requests; carry 3–5 short quotes (≤200 chars) as evidence.

## Coverage gating (lower-severity flag)

Text-derived anomalies (volume spike, negative-share spike, review-bombing, bug/feature clusters) run on
depth-capped `get_reviews` pages. `reviews_total` is `get_reviews_summary`'s `total.value` for the same
scope and window — review pages carry no total; a pull that ran until `nextCursor` was null or absent
fetched everything. If `reviews_fetched / reviews_total` is below the floor (default 60%, always
printed), or the total is unknown and the pull stopped at the depth cap, demote those findings to
"insufficient coverage — indicative only"; never assert them as confirmed. Ratings-derived findings are
complete and stand on their own.

## Group rollup

Weight per-app metrics by each app's rating count (`starsTotal` in its latest `get_ratings_history`
row); merge cross-app clusters into a single finding with `affected_apps` (a review's
`metaInformation.extId` names its app).

## Testing feedback (separate set — only when pulled)

Testing feedback (`SKILL.md` Gather step D) never mixes with the public reviews: the KPIs, trend
series, anomaly heuristics and public-review coverage above run on public reviews only. Mine the
testing set with the same bug / feature clustering, but as a report section of its own, with its own
coverage (`reviews_fetched / reviews_total` of that pass, against the same floor) and its own 3–5
quotes per finding. `get_reviews_summary` does not take the flag, so the pass knows its
`reviews_total` only when it ran until `nextCursor` was null or absent; a pass cut at the depth cap
counts as below the floor. Label its findings `testing-feedback` in `suggested_labels` and start their
`dedup_key` with `testing-feedback-`, so a re-run or a tracker never merges them with public-review
findings. In `findings.json` the top-level `coverage` stays the public pass; record the testing
pass's `reviews_fetched` and `reviews_total` (`null` when unknown) in each testing finding's
`metrics`.
