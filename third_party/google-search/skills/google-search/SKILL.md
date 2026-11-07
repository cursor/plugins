---
name: google-search
description: Use Google Search through the Ace Data Cloud MCP server in Cursor. Use for Google Search search results work or an existing task query.
---

# Google Search in Cursor

This skill adapts the [existing Ace Data Cloud skill](https://github.com/AceDataCloud/Skills/tree/main/skills/google-search). The live MCP schema is the source of truth for arguments and models.

1. Check [current price, balance, and service access](https://platform.acedata.cloud/models) before a paid call.
2. Call `serp_google_search` once and inspect the returned search results. This synchronous operation has no task ID to poll.
3. Return the result, task ID if present, and any service error. Keep the API token out of chat and files.

Configure `ACEDATACLOUD_API_TOKEN` in **Customize → Plugins → Google Search → Configure**. See the [first-run guide](../../README.md).
