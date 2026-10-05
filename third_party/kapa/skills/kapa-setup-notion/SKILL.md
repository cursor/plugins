---
name: kapa-setup-notion
description: Set up a Kapa Notion source so a Notion workspace is ingested. Use when the user wants Kapa to answer from their Notion pages or databases.
---

# Set up Notion

## 1. The out-of-band setup, which is where this usually fails

Tell the user to:

1. Open https://www.notion.so/profile/integrations and create an internal
   integration.
2. Copy its internal integration secret.
3. **Open each page or database Kapa should read and share it with that
   integration**, from the page's own menu.

Step 3 is the one people miss. The token only reaches pages explicitly shared
with the integration, so a valid token with nothing shared ingests nothing and
reports no error.

## 2. Create the source

`create_notion_source` with `project` and `name`. Keep the returned id.

## 3. Check the token and list what it can see

`validate_notion_workspace` with `api_token` confirms the token works.

**A valid token does not mean it can see anything.** Always follow it with
`list_notion_pages` and `list_notion_databases`: they answer with what was
actually shared with the integration. An empty list here means step 3 of the
integration setup was skipped, not that the token is broken.

Both answer with at most 20 results, so pass `title_contains` to search.

Show the user the real page titles and ask which to ingest, rather than asking
them to find page ids themselves.

## 4. Configure it

`set_notion_config` with `source_notion` and `api_token`. The token is the
user's secret: ask for it, never invent one.

Ask whether to take everything the integration can see, or to narrow it:

- `page_ids_include` takes single pages.
- `page_ids_include_with_children` takes a page **and everything nested under
  it**, which is what to use for a section of a wiki.
- `database_ids_include` takes databases. A database brings in the pages
  connected to it.

A Notion page id is the last part of its URL: the 32 hex characters after the
title.

## When it ingests nothing

The integration has no pages shared with it. Send the user back to step 3
rather than changing the config: the token is fine.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
