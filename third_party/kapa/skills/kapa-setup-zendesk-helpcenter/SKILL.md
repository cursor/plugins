---
name: kapa-setup-zendesk-helpcenter
description: Set up a Kapa Zendesk Help Center source so help center articles are ingested. Use when the user wants Kapa to answer from their Zendesk knowledge base.
---

# Set up Zendesk Help Center

Connects through OAuth, so the user approves it in their browser.

## 1. Create the source

`create_zendesk_helpcenter_source` with `project` and `name`. Keep the id.

## 2. Start the connection

`connect_zendesk_helpcenter` with the source `id` and the user's `subdomain`,
the first label of their zendesk.com host. For `https://acme.zendesk.com` that
is `acme`.

It returns an `auth_url`. **Open it in the user's browser** and ask them to
approve it there.

## 3. Wait for the user, then check once

The approval happens in the browser, so there is nothing to poll. Ask the user
to tell you when they have approved it, then call
`check_zendesk_helpcenter_connection` **once**. It answers with the connection,
or null if they have not finished.

## 4. Configure what it ingests

`configure_zendesk_helpcenter` with `auth_method` set to `oauth`. Without that
the grant is never attached and the source has no credential.

`url` is the **API root, not the browser URL**. Take the part before `/hc` and
append `/api/v2`, and put the locale in `language_code`. So
`https://acme.zendesk.com/hc/en-us` becomes `url=https://acme.zendesk.com/api/v2`
and `language_code=en-us`. Putting the locale in both doubles it in every
ingested link.

Ask which parts of the help center to read. `include_categories` and
`include_sections` take what the user picks, and leaving both out reads the
whole help center.

## Notes

The grant belongs to whoever approves it, so only that person can configure the
source afterwards.

An "invalid authorization request, no such client" error is a Zendesk-side
configuration problem, not something to retry. Tell the user their Zendesk
account needs the Kapa OAuth client registered.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
