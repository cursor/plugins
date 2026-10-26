# Read-only tools

If your MCP host lets you allow specific tools, these are the ones that only read — no write, no
confirmation token minted. See your host's own documentation for how to apply an allowlist; this
toolkit does not set one for you.

| Tool | Purpose |
|---|---|
| `whoami` | identity / session check |
| `get_server_info` | deployed build sha + liveness |
| `get_credits` | remaining credit balance |
| `list_collections` | list the account's collections |
| `list_apps` | list tracked apps |
| `get_reviews` | paged raw reviews (one collection per call, or one app in it) |
| `get_reviews_summary` | numeric review aggregate |
| `get_reviews_ai_summary` | AI bullet summary of reviews |
| `reviews_semantic` | per-review tags + sentiment |
| `get_ratings_history` | daily/total ratings series |
| `get_gp_console_ratings` | Google Play Console ratings |
| `get_rankings` | category rank |
| `list_keywords` | tracked keyword positions |
| `aso_search_results` | SERP results / own card |
| `aso_search_suggestions` | keyword suggestions |
| `aso_search_ads_recommendations` | Search Ads recommendations (App Store) |
| `aso_featured_apps` | featured-apps placements |
| `get_aso_report_app_store` | App Store ASO report |
| `get_aso_report_gdc_google_play` | Google Play ASO report |

## Not on this list

The six `*_preview` tools mint a live confirmation token that authorizes a write; the six write
tools (`add_app`, `add_collection`, `edit_keywords`, `reply_to_review`, `report_review_concern`,
`import_reviews`) consume that token and perform the write. Neither half is read-only.
`submit_feedback` writes feedback. `get_app_metadata` is probed-optional — not every session
advertises it, which is why it is not in the table above. It READS only: if your session does
expose it, add it to your allowlist, or an ASO metadata probe that depends on it silently stops
working (`tool-map.md`, `costs.md`).
