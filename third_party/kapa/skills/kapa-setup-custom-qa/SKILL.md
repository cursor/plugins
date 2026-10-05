---
name: kapa-setup-custom-qa
description: Set up a Kapa custom question and answer source so hand-written answers are ingested. Use when the user wants to write answers directly for questions their documentation does not cover.
---

# Set up custom answers

The one source the user writes themselves. Use it when an answer exists nowhere
else, or when Kapa keeps getting something wrong and they want to correct it
directly.

## 1. Create the source

`create_custom_qa_source` with `project` and `name`. Keep the returned id.

## 2. Add the pairs

`add_custom_qa_pair` with `custom_qa_source`, `question` and `answer`. **Call it
once per pair**; there is no batch call.

Confirm the full list with the user before you start, then add them one at a
time.

## Writing them well

- Write the `question` the way a user would actually ask it, not as a heading.
  "How do I rotate an API key?" rather than "API key rotation".
- The `answer` takes Markdown.
- The same question text cannot be added twice to one source.

## After adding

Each pair ingests as it is added, so there is no separate publish step.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
