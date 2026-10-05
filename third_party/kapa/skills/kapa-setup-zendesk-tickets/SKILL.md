---
name: kapa-setup-zendesk-tickets
description: Set up a Kapa Zendesk tickets source so support tickets are ingested. Use when the user wants Kapa to answer from their Zendesk support history.
---

# Set up Zendesk tickets

Connects through OAuth, so the user approves it in their browser.

## 1. Create the source

`create_zendesk_tickets_source` with `project` and `name`. Keep the id.

## 2. Start the connection

`connect_zendesk_tickets` with the source `id` and the user's `subdomain`, the
first label of their zendesk.com host. For `https://acme.zendesk.com` that is
`acme`.

It returns an `auth_url`. **Open it in the user's browser** and ask them to
approve it there.

## 3. Wait for the user, then check once

The approval happens in the browser, so there is nothing to poll. Ask the user
to tell you when they are done, then call `check_zendesk_tickets_connection`
**once**.

## 4. Ask whether to ingest this at all

Support tickets routinely contain customer names, email addresses and account
details. Ask whether that should be ingested at all before setting this up on
a project that serves external users.

## 5. Set PII masking

This source carries customer names, email addresses and account details, so
set masking up front. Setting it later works, since `update_source` queues the
already-ingested items to be reprocessed under the new rules, but that spends
quota re-reading everything. Doing it first avoids the second pass.

Call `update_source` with `markdown_pii_config` first, for example
`{"entities": ["EMAIL_ADDRESS", "PERSON", "PHONE_NUMBER"]}`. The available
entities are PHONE_NUMBER, EMAIL_ADDRESS, PERSON, CREDIT_CARD and IBAN_CODE.
Use `allow_list` for strings that look like PII but should stay, such as a
support alias.

Ask the user what should be redacted. Do not assume, and do not skip this
because they did not raise it.

## 6. Configure what it ingests

`configure_zendesk_tickets` with `auth_method` set to `oauth` and the same
`subdomain`. Without the auth method the grant is never attached.

Show these options and ask which the user wants. Support tickets are usually
the largest source a team has, so say what each filter would leave out rather
than applying one silently.

- `ticket_age`: how far back to read, or all history.
- `statuses` and `priorities`: which tickets to read, or all of them.
- `tags`: only tickets carrying these tags. `tags_exclude` drops tickets
  instead.

## Notes

The grant belongs to whoever approves it, so only that person can configure the
source afterwards.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
