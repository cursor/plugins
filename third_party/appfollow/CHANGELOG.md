# Changelog

All notable changes to this project are documented here. Format follows Keep a Changelog; versions
follow SemVer.

## [Unreleased]

### Changed

- Credit costs follow the action-based prices: setup tools are free and adding an app costs 1, a
  list, report or rankings read costs 12, a date-range read costs 12 for each started 14 days, the
  reviews summary costs 24 (two 12-credit reads, whatever the date range), replying to or
  reporting a review costs 3, and AI work on a batch costs 48. The cost list, the aso-analysis
  estimate and the search skill show the new prices.

## [1.3.0] - 2026-10-21

### Added

- Google Play testing feedback on request: `get_reviews` takes an optional `testing_feedback` flag.
  For a Google Play app, `true` returns only reviews left on a closed or open testing track and
  `false` or absent only public reviews — never both in one call for that app; other stores ignore
  the flag and keep returning their public reviews, so a `true` call is scoped to one Google Play app
  with `ext_id`. The feedback report pulls it as a separate pass, one Google Play app at a time, when
  asked. It needs the app's Google Play Console connected to AppFollow; without that the pass comes
  back empty, not as an error.

### Changed

- The Codex plugin listing now shows a short tagline ("App reviews, ratings & ASO") and links to
  the AppFollow support site, matching the support link the Claude plugin manifest already carried.
- The keyword write pair is now `edit_keywords` / `edit_keywords_preview` (was `add_keywords` /
  `add_keywords_preview`) and is documented as replacing the tracked keyword set for one
  collection, country and device. The aso-analysis add-keyword loop now sends the current set plus
  the selected candidates, so existing keywords are never dropped.
- Workflows follow the new contracts of the eight MCP tools that moved to AppFollow's public API v3
  (`list_collections`, `list_apps`, `add_app`, `get_reviews`, `get_reviews_summary`,
  `get_ratings_history`, `get_gp_console_ratings`, `reply_to_review`). Review reads and summaries take
  the collection's `apps_id` (`collectionId` from `list_collections`), with `ext_id` to narrow to one
  app, so the feedback report pulls a whole collection's reviews in one paged call instead of one loop
  per app, and review pages follow `nextCursor` (passed back as `cursor`) instead of page numbers.
  `get_ratings_history` needs no collection lookup: it takes `ext_id`, the short `store` code and one
  `country` (default `all`, worldwide) and returns the full series in one call, with no `limit`.
  `get_gp_console_ratings` takes `apps_id` + `ext_id`, `reply_to_review` takes `apps_id` + `store`, and
  `add_app` takes ten short store codes plus `is_competitor` / `has_translation` — the competitor audit
  now adds rivals with `is_competitor: true`, so a rival counts as a competitor, not as one of the
  user's own apps. `list_apps` reports the long store name; the tool map lists the short code each one
  maps to. The competitor audit's new-ratings read (incremental average and star split) is App Store
  only: `get_ratings_history` has no incremental series for Google Play.

## [1.2.1] - 2026-10-08

### Added

- README Quick start now names both install paths as copy-pasteable commands: the plugin
  marketplace source and the skills-only `npx skills add …` install, with a note that the latter
  does not bring the bundled MCP connection.
- The plugin listing now carries an icon, documentation, support, privacy and terms links, and
  names the MCP server it connects to; `SECURITY.md` gained a **Credentials** section stating that
  the toolkit reads no token or API key.

### Fixed

- The shipped icon and logo were a corrupt PNG that no viewer could decode. Both are now the
  official 512×512 AppFollow mark.

## [1.2.0] - 2026-09-08

### Added

- `get_server_info` in the tool map, the read-only list and the credit-cost table. The MCP server
  has always served it on the public pod (deployed build sha plus liveness, free, no arguments);
  this toolkit simply never named it, so a host-side read-only allowlist built from
  `read-only-tools.md` silently excluded it.
- New `competitors` skill (`/competitors`): finds an app's real competitors in one region on either
  or both stores from live store search, adds the chosen ones to tracking, and reports share of
  search, not-yet-tracked rivals, category position, and 30-day rating velocity with a star
  breakdown — as a self-contained HTML report plus a `report_type: "competitors"` findings file.

### Fixed

- The `session_id` rule in `SKILL.md` said to pass `session_id` on **every** tool call, but
  `get_server_info` takes no arguments at all -- a compliant caller would have sent it an invalid
  arg. Added an explicit exemption.

## [1.1.0] - 2026-08-03

### Changed

- Reviews guidance aligned with the MCP `get_reviews` contract: the tool is per-app
  (`ext_id` required — `collection_name` is no longer accepted); a collection is gathered by
  looping `list_apps`'s ext_ids, and paging stops when `reviews.page.next` is null.

## [1.0.1] - 2026-08-01

### Fixed

- Codex marketplace descriptor (`.agents/plugins/marketplace.json`): plugin `source` used the
  git/URL form `{"source": "url", "url": "./"}`, which Codex rejects for a plugin living in this
  same repo. Now the local-path form `{"source": "local", "path": "./"}`.

## [1.0.0] - 2026-07-15

First stable release of the **AppFollow AI Toolkit** — a Claude Code + Codex plugin that turns the
public AppFollow MCP server into ready-made analyst workflows. Everything runs on the user's own
OAuth-authenticated MCP session and workspace credits; there is no bundled API client and no secrets,
and only public MCP tools are ever referenced.

What's included:

- **Skills** — `using-appfollow` (always-loaded discipline: session opening, a single
  20%-of-remaining credit gate, the preview → approval → confirm write ritual, the shared error-code
  vocabulary, and the optional feedback flow); `search` (find and start tracking apps);
  `aso-analysis` (keyword report tiered by AppFollow's real effectiveness score, an interactive
  add-keyword loop, and metadata suggestions); `feedback-analysis` (review KPIs with deltas, rating
  and sentiment trends, anomaly callouts, and ranked bugs + feature requests).
- **Output** — each report emits a structured `findings.json` plus a self-contained HTML and Markdown
  report; the user's own connected tracker agent can file the findings.
- **Packaging** — Claude Code and Codex plugin manifests with thin slash commands and a shared
  `.mcp.json` connection to the AppFollow MCP server. The plugin displays as "AppFollow AI Toolkit"
  in both UIs.
- **Licensing** — Apache-2.0.

The skills, the `findings.json` output contract, and the plugin manifests are stable from here: a
breaking change to any of them is a MAJOR version, never a MINOR or PATCH.
