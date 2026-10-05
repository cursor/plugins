---
name: kapa-check
description: Inspect Kapa source status and check knowledge retrieval. Use when the user wants to see what a project holds or diagnose thin answers.
---

# Check a Kapa project

Call list_sources for my Kapa project and show me what it holds and where each source has got to. Then ask me a question my content should answer, call search_project_knowledge with it, and show me what comes back. If the answer is thin or wrong, say what would cause that rather than declaring success.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
