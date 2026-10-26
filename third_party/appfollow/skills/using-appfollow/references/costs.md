# Credit costs

Source: `docs.api.appfollow.io/reference/methods-cost-and-availability`.

**Unit convention:** `N cr` = credits per successful request. Qualifiers: `/page` (per 100-row page),
`/review`, `/reply`, `+ M cr / D days` (an extra period-scoped charge), `per started D days (min N)`
(a date-range read: N cr for each started D days of the range, at least N). `0 cr` means exactly
zero — free. Plan-tier availability (which plan can call a tool at all) is a **separate axis** from
cost — it is never folded into the cost cell; see the per-row notes instead.

| Tool | Cost | Notes |
|---|---|---|
| `whoami` | 0 cr | MCP session check, not billed |
| `get_server_info` | 0 cr | MCP session check, not billed |
| `get_credits` | 0 cr | MCP session check, not billed |
| `list_apps` | 0 cr | |
| `list_collections` | 0 cr | |
| `get_reviews` | 12 cr / page (100 reviews) | Free plan sees only the last 50 reviews (plan access, not a cost difference) |
| `get_reviews_summary` | 24 cr | two 12 cr review-metric reads, whatever the date range |
| `get_reviews_ai_summary` | 48 cr | |
| `reviews_semantic` | 48 cr | no paging: one call covers up to 100 reviews |
| `get_ratings_history` | 12 cr per started 14 days (min 12) | |
| `get_gp_console_ratings` | 12 cr per started 14 days (min 12) | |
| `get_rankings` | 12 cr | |
| `list_keywords` | 12 cr | one request = one app/country/device |
| `aso_search_results` | 12 cr | |
| `aso_search_suggestions` | 12 cr | |
| `aso_search_ads_recommendations` | 12 cr | App Store only |
| `aso_featured_apps` | 12 cr per started 14 days (min 12) | |
| `get_aso_report_app_store` | 12 cr | |
| `get_aso_report_gdc_google_play` | 12 cr | |
| `get_app_metadata` | n/a | probed-optional tool; not shipped as an MCP tool (skill probes, falls back to user paste) |
| `add_app` | 1 cr | |
| `add_collection` | 0 cr | |
| `edit_keywords` | 0 cr | |
| `reply_to_review` | 3 cr / reply | |
| `report_review_concern` | 3 cr / review | |
| `import_reviews` | 0 cr | setup: free at the gateway |
| `add_app_preview`, `add_collection_preview`, `edit_keywords_preview`, `reply_to_review_preview`, `report_review_concern_preview`, `import_reviews_preview` | 0 cr | preview calls mint a confirmation token only, no upstream billed call |
| `submit_feedback` | 0 cr | toolkit-level, no upstream call |
