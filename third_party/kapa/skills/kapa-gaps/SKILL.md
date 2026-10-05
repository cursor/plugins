---
name: kapa-gaps
description: Review Kapa coverage gaps and frequent questions. Use when the user wants to identify missing documentation and prioritize new content.
---

# Review Kapa coverage gaps

Show me where my Kapa project falls short. Call list_coverage_gaps_periods for my project, then get_coverage_gaps with the most recent period id to see what people asked that my content does not cover. Do the same with list_top_questions_periods and get_top_questions for what they ask most. Summarise both and suggest what content would close the biggest gaps.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
