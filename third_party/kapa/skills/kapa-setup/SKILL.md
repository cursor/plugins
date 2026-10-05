---
name: kapa-setup
description: Set up a Kapa project and connect an appropriate knowledge source. Use when the user wants to begin a Kapa project or choose a source type.
---

# Set up a Kapa project

Set up my Kapa project using the kapa MCP server. Start by calling list_projects to confirm I am signed in; if it fails with an authentication error, guide me through the current host's Kapa sign-in flow, then wait for me before retrying. Ask which project if there is more than one. Then ask what I want Kapa to answer questions about, and load the matching kapa-setup-* skill for what I choose rather than working the calls out yourself. Do not pick filters for me: show the options and ask.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
