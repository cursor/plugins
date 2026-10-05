---
name: kapa-setup-jira-service-management
description: Set up a Kapa Jira Service Management source so service desk requests are ingested. Use when the user wants Kapa to answer from their JSM request history.
---

# Set up Jira Service Management

## 1. Have the user create an API token

https://id.atlassian.com/manage-profile/security/api-tokens.

## 2. Create the source

`create_jira_service_management_source` with `project` and `name`. Keep the id.

## 3. Check the credential and list the desks

`validate_jira_service_management` with `base_url`, `username` and `api_token`
answers `{"is_valid": bool}`. Read the message back to the user on a failure:
a bad URL, a bad credential and a permissions problem all answer the same way.

Then `list_jira_service_desks` shows the desks, and `list_jira_request_types`
the request types.

The request types cannot be scoped to one desk and carry no desk id, so names
repeat across desks. Show the whole list rather than matching on a name.

## 4. Ask whether to ingest this at all

Service desk requests often carry customer names, email addresses and private
internal comments. Ask whether that content should be ingested at all before
setting this up on a project that serves external users.

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

## 6. Configure it

`set_jira_service_management_config` with `source_jira_service_management`,
`base_url`, `username` and `api_token`.

- `base_url` is the site root, such as `https://acme.atlassian.net`.
- `username` is the Atlassian account email the token belongs to.
- `api_token` is their secret. Ask for it, never invent one.

**Say what the age filter does before accepting it.** `request_age` limits how
far back requests are read, and the dashboard's own default is the last month
only. Tell the user the window you are setting and confirm it, rather than
quietly ingesting four weeks of a multi-year desk.

Ask which desks to read. `service_desk_ids_include` takes the ones the user
picks, and leaving it out reads every desk on the site. Use
`list_jira_service_desks` to show them the real names rather than asking for
ids.

Ask which request types to read as well. `request_type_ids_include` and
`request_type_ids_exclude` take ids from `list_jira_request_types`.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
