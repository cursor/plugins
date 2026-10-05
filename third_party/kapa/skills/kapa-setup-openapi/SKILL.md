---
name: kapa-setup-openapi
description: Set up a Kapa OpenAPI source so an API specification is ingested. Use when the user wants Kapa to answer questions about their API endpoints.
---

# Set up OpenAPI

## 1. Create the source

`create_openapi_source` with `project` and `name`. Keep the returned id.

## 2. Check the specification

`validate_openapi_url` with `url` confirms the document parses.

On success it answers with the spec's title and version, and **there is no
`valid` key**. A failure answers `{"valid": false}`. So treat the presence of a
title as success, not the value of `valid`.

Reading the title back to the user is a cheap way to confirm the URL points at
the spec they meant.

## 3. Configure it

`set_openapi_config` with `source_openapi` and `url`.

`url` must point at the **specification document itself**, the JSON or YAML,
not the documentation page that renders it. Swagger 2.0 and OpenAPI 3.x both
work.

Pass `linked_url` as well. It is the human-readable documentation page, and
without it answers cite the raw specification, which is not useful to a reader.

## Why this often beats crawling the same pages

API reference pages usually render their request and response schemas in the
browser, so a web crawl of them captures only a title and a line of
description. The specification is structured, so it gives cleaner coverage of
every endpoint. If the user is crawling a documentation site that includes API
reference pages, suggest excluding those paths from the crawl and adding this
source instead.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
