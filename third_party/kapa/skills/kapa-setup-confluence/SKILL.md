---
name: kapa-setup-confluence
description: Set up a Kapa Confluence source so a Confluence site is ingested. Use when the user wants Kapa to answer from Confluence pages or spaces.
---

# Set up Confluence

## 1. Have the user create an API token

Tell them to open https://id.atlassian.com/manage-profile/security/api-tokens
and create one. The token carries that person's own access, so the source
ingests exactly what they can see. A space missing later usually means their
account cannot read it.

## 2. Create the source

`create_confluence_source` with `project` and `name`. Keep the returned id.

## 3. Check the credential and list the spaces

`validate_confluence` with `url`, `email` and `api_token` answers whether the
credential can read the site. Do this before saving anything: a wrong token
otherwise shows up as a source that silently ingests nothing.

A false here is most often a `/wiki` suffix on the URL rather than a bad
token. Pass the site root only.

Then `list_confluence_spaces` with the same arguments shows what that account
can see. Show the user the real space names and ask which to ingest, rather
than asking them to find space keys themselves.

`list_confluence_pages` takes `space_keys_include` as well, so choose spaces
first: without it, it walks every visible space.

## 4. Configure it

`set_confluence_config` with `source_confluence`, `url`, `email` and
`api_token`.

- `url` is the site root **without `/wiki`**, such as
  `https://acme.atlassian.net`. Kapa adds `/wiki` itself, and a URL that
  already ends in it breaks ingestion.
- `email` is the Atlassian account the token belongs to. Ask for it; do not
  guess it from the user's other accounts.
- `api_token` is their secret. Ask for it, never invent one.

Use `list_confluence_spaces` to show the user what the token can see, then
ask which spaces to ingest. `space_keys_include` takes the ones they pick, or
`space_keys_exclude` drops a few from everything. Leaving both out ingests
every visible space, including internal ones.

## When it ingests nothing

The account behind the token cannot see that space. Have the user check their
own Confluence access before changing the config.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
