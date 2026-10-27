---
name: PickFu consumer polls
description: >-
  Use when the user wants consumer feedback via PickFu — draft or publish a
  poll, pull results, summarize what respondents said, or suggest a follow-up.
  Calls PickFu MCP tools only; never invent poll results.
---
# PickFu consumer polls


## When to use

- Create or refine a consumer poll / survey
- Publish only when the user explicitly asks
- Fetch results and summarize qualitative + quantitative feedback
- Suggest a follow-up question from answers

## Rules

- Use the PickFu MCP tools (`save_survey` / `publish_survey` / `get_survey` / results tools as available). Do not invent responses or scores.
- Auth is the **importer's** PickFu account via MCP OAuth. Never use a shared team token.
- Do **not** auto-publish or spend credits. Create drafts freely; publish and add respondents only on an explicit ask.
- Prefer plain, non-leading questions. Keep options parallel.
- No internal PickFu operator tooling, no account IDs in user-facing copy.

## Flow

1. Confirm the question + options (and targeting if they named an audience).
2. Save as draft → show URL / id when available.
3. Publish only after they say publish.
4. When results exist, summarize winners + notable qualitative themes; offer one follow-up.
