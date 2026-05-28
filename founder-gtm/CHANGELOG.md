# Changelog

## 0.5.1 (2026-05-27)

Marketplace readiness pass before private team rollout.

- Added a lightweight `gtm-playbook` skill so the canvas is discoverable from the marketplace skill list.
- Added a plugin logo and shortened the manifest description for the Marketplace hero card.
- Updated README and distribution notes for the Anysphere team marketplace flow.
- Removed remaining hardcoded local plugin paths from runtime docs and scripts. Scripts now resolve the plugin root from `CURSOR_PLUGIN_ROOT` or their installed file location.
- Automation workflow JSON now defaults to the current project root, where `sales-pack.md` and `outreach-log/` live, instead of assuming a local plugin checkout.

## 0.5.0 (2026-05-27)

Seven upgrades shipped from a focused improvement pass.

**New skill**
- `gtm-warm-intro`, reads the founder's LinkedIn connections CSV, ranks bridges per prospect, drafts the intro-request message plus a forwardable blurb the bridge can paste verbatim. Warm intros convert at 5 to 10x cold; this is the single highest-leverage channel skill in the plugin. Sends via Gmail when available or generates copy-paste markdown.

**New first-run capability**
- `gtm-sales-pack` Section 6 (Voice) now offers three paths: (A) extract voice patterns from your sent Gmail via the existing OAuth token, (B) paste samples manually, or (C) use defaults. The new `scripts/extract-voice-from-gmail.py` pulls sentence-length distribution, opener capitalization, punctuation tics, recurring n-grams, sign-off style, and 3 redacted excerpts. Read-only and idempotent. Requires `google-api-python-client`, `google-auth`, `google-auth-oauthlib` (pinned in the new `scripts/requirements.txt`).

**Self-improving learning loop**
- `gtm-get-better` Step 8.5 now proposes edits to the skill files themselves when a pattern wins consistently (N≥20, 2x positive rate, 2+ cycles). Founder approval gates every change. Provenance markers (`<!-- compound-update: ... -->`) track which edits came from the loop. Capped at 3 proposals per run. Excludes `rules/gtm-voice-guide.mdc`.

**Three starter plays in `gtm-design-play/plays/`**
- `recent-seed-fundraisers-vp-eng.md`, person+account hybrid, cold email channel, full 4-touch cadence
- `show-hn-launches-ai-infra.md`, person signal, X DM primary + email fallback
- `linkedin-job-change-eng-leader.md`, person signal, LinkedIn channel
- Each is fully populated. Founders fork them instead of designing from scratch.

**Voice enforcement at write-time**
- New `afterFileEdit` hook (`hooks/check-voice-on-edit.sh`) scans saved files under `outreach-log/`, `prospects/`, and `drafts/` for AI tells: em/en dashes, "I hope this finds you well" variants, "Excited to announce", "Thrilled to share", and the high-risk subject words from `gtm-cold-email`. Returns `additional_context` warnings; fail-open, non-blocking.

**Lookalike targeting**
- `gtm-find-prospects` Step 3.5 now has a complete recipe: reads `existing-customers.txt`, extracts 3 attributes per customer, aggregates the dominant pattern, runs LinkedIn / Crunchbase / X bio cross-search, dedupes against existing + pipeline, and scores prospects with a +10 boost for full-triangle attribute matches.

**Voice rule expanded**
- `rules/gtm-voice-guide.mdc` gained a 10-pattern "Anti-AI tells" section sourced from `blader/humanizer`: superficial -ing tails, copula avoidance, false ranges, persuasive authority tropes, signposting, hyphenated predicate overuse, sycophantic tone, generic positive conclusions, filler phrases, excessive hedging. Each with the fix.

**Plumbing cleanups**
- All em/en dashes swept from prose across `skills/`, `rules/`, `hooks/`. Preserved only inside fenced code blocks and warning-subject examples (where the dash is the subject of the warning).
- `scripts/requirements.txt` added to both `gtm-sales-pack/scripts/` and `gtm-cold-email/scripts/` pinning the Gmail API dependencies.

**Canvas refresh**
- Hero stats updated to reflect 9 skills, 6 helper scripts, 3 starter plays. Skills table adds the `/gtm-warm-intro` row. "What's in the package" footer now mentions the starter plays and the second hook.

## 0.4.0 (2026-05-27)

Plugin-wide rename: all skills now prefixed `gtm-` (except `gtm-setup` which already had it).

**Renamed**
- `sales-pack` → `gtm-sales-pack`
- `find-prospects` → `gtm-find-prospects`
- `design-play` → `gtm-design-play`
- `x-outreach` → `gtm-x-outreach`
- `linkedin-outreach` → `gtm-linkedin-outreach`
- `cold-email` → `gtm-cold-email`
- `get-better` → `gtm-get-better`

Every cross-reference updated across SKILL.md files, the canvas, README, CHANGELOG, resources.md, automations, and `plugin.json`.

**Other v0.4.0 changes**
- Fixed `gtm-find-prospects` description rendering: `<campaign>` was being parsed as an HTML tag and stripped. Replaced with `{campaign}` here and in two other skills with the same pattern.
- `rules/gtm-voice-guide.mdc` gained the "Anti-AI tells (the humanizer pass)" section.
- `gtm-linkedin-outreach` now asks tool choice + daily-limit at Step 0 (before any prereq check). Account-type table gives suggested daily caps. Per-day counter file refuses sends past the limit.
- New `hooks/welcome-on-first-session.sh` greets new founders in any project without a sales-pack yet. Gated by `.gtm-state/welcomed` marker so it only fires once per project.

## 0.3.0 (2026-05-27)

Added based on internal GTM-repo distillation and early founder feedback.

**New skill**
- `design-play`, codify a working signal/persona/cadence/offer into a reusable play. Reads from working campaigns; writes to `plays/<name>.md`. Drawn from the internal play-design framework.

**New automations folder**
- `automations/` with five recommended Cursor Automation specs:
  - `weekly-get-better` (cron, Mondays)
  - `daily-followups` (cron, weekday mornings, advances cold-email sequences under the daily cap)
  - `post-campaign-debrief` (cron or Slack-trigger, ingests replies the morning after a send)
  - `positive-reply-ping` (cron, notifies only on positives)
  - `trial-expiry-sweep` (cron, optional for PLG founders on Stripe)

**New find-prospects scripts**
- `scripts/techcrunch-funding-rss.py`, recent rounds from TechCrunch RSS
- `scripts/hn-show-scraper.py`, Show HN launches via Algolia
- `scripts/x-topic-search.py`, bio + topic search via the local xmcp MCP
- `scripts/domain-histogram.py`, work vs personal email split for any CSV
- `scripts/title-classifier.py`, keyword + exclusion bucketing (no LLM, no API key)
- `data/title-keywords.txt`, `data/title-exclusions.txt`, `data/personal-email-domains.txt`, tunable by the founder without touching Python

**Edits to existing skills**
- `cold-email`: subject-line framework with reasons (works / fails / why), sender identity section with the warm-domain trust multiplier.
- `sales-pack`: split high-signal vs low-signal CTAs, added "Features by buyer need" and "Signal strength cheat sheet" template sections.
- `get-better`: pos+obj rate added as secondary metric, signal-first retirement rule, "do not re-offer" rule, high-risk subject auto-flag.
- `find-prospects`: signal source catalog mapped to the new scripts, account-mode confidence scoring.
- `rules/gtm-voice-guide.mdc`: anti-patterns expanded (no Step-1 bullets, one CTA with breakup exception), mechanics block (numerals, sentence case, straight quotes), transferable technical-buyer principles.

**Distribution**
- Added `LICENSE` (MIT) and this `CHANGELOG.md`.
- Enriched `.cursor-plugin/plugin.json` with `displayName`, `homepage`, `repository`, `license`.

## 0.1.0 (2026-05-27)

Initial scaffold.

- 7 skills: `gtm-setup`, `sales-pack`, `find-prospects`, `x-outreach`, `linkedin-outreach`, `cold-email`, `get-better`.
- `rules/gtm-voice-guide.mdc` (always-applied anti-slop voice rules).
- `canvases/founder-gtm-playbook.canvas.tsx` (the visual playbook).
- `resources.md` (opinionated reading list).
- `skills/cold-email/scripts/gmail-auth.py` (one-time Gmail OAuth bootstrap).
