# Public MCP tool map

The complete set of AppFollow MCP tools available to this toolkit. Tool names are validated for
parity in CI. Tools surface as `mcp__appfollow__<name>`. Credit costs live in `costs.md`.

## Service

| Tool | Purpose |
|---|---|
| `whoami` | identity / session check |
| `get_server_info` | deployed build sha + liveness |
| `get_credits` | remaining credit balance |

## Apps & collections

| Tool | Purpose |
|---|---|
| `list_collections` | list the account's collections — `collectionId` is the `apps_id` other tools take, `collectionCode` the `collection_name` that `get_reviews_ai_summary` takes |
| `list_apps` | list the apps of one collection (`apps_id` required; dedupe target) — `extId` is the `ext_id` other tools take |
| `add_collection` | create a collection (preview→confirm) |
| `add_collection_preview` | mint a confirmation token for `add_collection` |
| `add_app` | track an app in a collection — `store` (short code), `ext_id`, `apps_id`, `locale` (two-letter country code); optional `is_competitor` (default `false`: one of the user's own apps), `has_translation` (preview→confirm) |
| `add_app_preview` | mint a confirmation token for `add_app` |

`list_apps` reports `store` as the long name, while the `store` argument takes the short code
(`report_review_concern` alone takes the long name): `itunes` = `as`, `googleplay` = `gp`,
`microsoftstore` = `ms`, `amazon` = `am`, `macstore` = `mc`, `xstore` = `xs`, `samsung` = `sg`,
`trustpilot` = `tp`, `huaweiappgallery` = `hg`, `steam` = `st`. `add_app`, `get_ratings_history` and
`reply_to_review` take all ten codes; `get_reviews_ai_summary` takes `as`, `gp`, `ms`, `am`.

## Reviews

| Tool | Purpose |
|---|---|
| `get_reviews` | paged raw reviews of one collection (workspace) — `apps_id`, `from`, `to` required; `ext_id` narrows to one app (absent = the collection's own apps; its competitor apps are left out); optional `country`, `lang`, `q`, `rating`, `sort`, `limit` (1–100 per page); page by passing each `nextCursor` back as `cursor` until it is null or absent (evidence); optional `testing_feedback` for Google Play testing feedback — see the note below the table |
| `get_reviews_summary` | review count + average rating of one collection (absent `ext_id` = its own apps, as in `get_reviews`), each with `previous` (the preceding period of equal length) and `diff` — `apps_id` required, `ext_id` narrows to one app; optional `country`, `lang`, `from`, `to` (default the last 30 days); `total.value` sizes a `get_reviews` pull (review pages carry no total) |
| `get_reviews_ai_summary` | AI bullet summary of reviews |
| `reviews_semantic` | per-review tags + sentiment |
| `reply_to_review` | reply to a review — `apps_id`, `store`, `ext_id`, `review_id`, `answer_text`: `review_id` is the review's `reviewId` from `get_reviews`, `store` its `metaInformation.store` (preview→confirm) |
| `reply_to_review_preview` | mint a confirmation token for `reply_to_review` |
| `report_review_concern` | flag a review (preview→confirm) |
| `report_review_concern_preview` | mint a confirmation token for `report_review_concern` |
| `import_reviews` | import reviews (preview→confirm) |
| `import_reviews_preview` | mint a confirmation token for `import_reviews` |

`get_reviews` takes an optional boolean `testing_feedback` (default `false`, Google Play only):

- For a Google Play app, `true` returns ONLY testing-feedback reviews — what testers left on a closed
  or open testing track, each arriving with `typeList: ["beta"]` — and `false` or absent returns ONLY
  public reviews. The two sets are disjoint: for that app one call never returns both, so reading both
  takes two calls.
- Other stores ignore the flag and always return their public reviews, so a workspace-wide `true` call
  mixes them in. Scope `true` calls with a Google Play `ext_id`.
- Requires the Google Play testing feedback plan feature and a Google Play Console connection with
  Testing feedback access. Without the connection the set is empty — no error.
- Same price per page either way (`costs.md`). `get_reviews_summary` does not take the flag: it
  counts public reviews only, so it never sizes a `true` pass.

## Ratings

| Tool | Purpose |
|---|---|
| `get_ratings_history` | public ratings series of one app — `ext_id` + `store` (short code) + `from` + `to`; one `country` per call (default `all`, worldwide); `period`, `type` (`total` cumulative or `diff` incremental — no `diff` for `gp`); the full series in one call, no paging |
| `get_gp_console_ratings` | Google Play Console ratings — `apps_id` + `ext_id` + `from` + `to` + `fields` (exactly one of `ratings`, `users`) |

`get_reviews`, `get_reviews_summary`, `get_ratings_history` and `get_gp_console_ratings` take
`YYYY-MM-DD` dates with `from` before `to` (`from` equal to `to` is refused). An `ext_id` on
`get_reviews` or `get_reviews_summary`, and every `get_gp_console_ratings` call, first looks the app up
in the collection. The lookup is free, and an `ext_id` that is not in that `apps_id` is `NOT_FOUND`
before any data call.

## ASO

| Tool | Purpose |
|---|---|
| `get_rankings` | category rank |
| `list_keywords` | tracked keyword positions |
| `aso_search_results` | SERP results / own card |
| `aso_search_suggestions` | keyword suggestions |
| `aso_search_ads_recommendations` | Search Ads recommendations (App Store) |
| `aso_featured_apps` | featured-apps placements (requires `ext_id`) |
| `get_aso_report_app_store` | App Store ASO report |
| `get_aso_report_gdc_google_play` | Google Play ASO report |
| `get_app_metadata` | current title/subtitle/description (probe; may be absent — falls back to user paste) |
| `edit_keywords` | replace the tracked keyword set for one collection/country/device — keywords not passed are dropped (preview→confirm) |
| `edit_keywords_preview` | mint a confirmation token for `edit_keywords` |

## Feedback

| Tool | Purpose |
|---|---|
| `submit_feedback` | send a 1–4 session-satisfaction score + optional comment(s) back to AppFollow; optional opt-in attachments (tool-usage log, session summary, full session transcript) |
