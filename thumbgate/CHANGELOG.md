# Changelog

## 1.23.1 - 2026-05-25

- Added `interface` block to plugin.json (displayName, capabilities, brandColor, privacy/TOS URLs)
- Added UTM-tagged homepage URL
- Added MCP keyword to plugin keywords
- Version aligned with ThumbGate core

## 0.8.1 - 2026-03-26

- Unified ThumbGate branding across all public surfaces (README, AGENTS.md, CLAUDE.md, GEMINI.md, landing page, package.json).
- Landing page SEO: "human-in-the-loop enforcement", "vibe coding" positioning, FAQPage JSON-LD schema for Google rich results.
- Added congruence CI check (`scripts/check-congruence.js`) — enforces version, branding, tech stack terms, and honest disclaimer across README and landing page on every PR.
- Performance: deferred non-critical side-effects in `captureFeedback` (contextFs, RLAIF self-audit) via `setImmediate`.
- Added `_captureMs` timing field to accepted feedback responses for observability.
- Added `mcpize.yaml` to version sync targets.
- Dead code removal: -1,551 lines (contract-audit.js, prove-rlaif.js, stale landing-page.html, 3 duplicate docs).
- Fixed GitGuardian incident #29200799: scrubbed hardcoded Google API key from git history.
- Social automation pipeline: post-everywhere CLI, reply monitor with AutoMod-safe Reddit posts.
- TDS article draft: "Beyond Prompt Rules: How Pre-Action Gates Stop AI Coding Agents From Repeating Mistakes".

## 0.8.0 - 2026-03-25

- **Lesson DB:** SQLite + FTS5 full-text search replaces linear Jaccard token-overlap. Sub-millisecond ranked search indexed by signal, domain, tags, importance.
- **Corrective actions:** On negative feedback, `capture_feedback` returns `correctiveActions[]` — top 3 remediation steps inferred from similar past failures.
- **search_lessons MCP tool:** Exposes corrective actions, lifecycle state, linked rules, linked gates, and next harness fixes per lesson.
- **search_thumbgate MCP tool:** Searches raw ThumbGate state across feedback logs, ContextFS memory, and prevention rules.
- **Rejection ledger:** Tracks why vague feedback was rejected with revival conditions.
- **Bayesian belief updates:** Each memory carries a posterior that updates on new evidence; high-entropy contradictions auto-prune.

## 0.7.4 - 2026-03-20

- Added `session_handoff` and `session_primer` MCP tools for seamless cross-session context continuity.
- New `session` namespace in ContextFS stores primer.json with auto-captured git state (branch, last 5 commits, modified files, working tree status), last completed task, next step, and blockers.
- `session_handoff` records provenance events for full audit trail of session transitions.
- Closes Layer 2 (primer.md) of the 5-layer memory stack — no manual primer file needed.
