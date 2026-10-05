---
name: kapa-setup-jira
description: Set up a Kapa Jira source so Jira issues are ingested. Use when the user wants Kapa to answer from their Jira issue history.
---

# Set up Jira

Jira Cloud only. Jira Server and Data Center are not supported.

## 1. Have the user create an API token

https://id.atlassian.com/manage-profile/security/api-tokens. The token carries
that account's own access.

## 2. Create the source

`create_jira_source` with `project` and `name`. Keep the returned id.

## 3. Check the credential and list the projects

`validate_jira` with `base_url`, `username` and `api_token`. It answers three
ways, not two: `true`, `"Unauthorized"` (the credential is wrong) or
`"Not Found"` (the URL is wrong). Tell the user which of the two they need to
fix.

Then `list_jira_projects`, `list_jira_statuses`, `list_jira_resolutions` and
`list_jira_issue_types` show the real options to choose from.

Those four answer with an empty list when something goes wrong, which looks
identical to a site with nothing in it. Trust `validate_jira` for credential
health, not an empty list.

## 4. Configure it

`set_jira_config` with `source_jira`, `base_url`, `username` and `api_token`.

- `base_url` is the site root **without `/wiki`**, such as
  `https://acme.atlassian.net`.
- `username` is the Atlassian account email the token belongs to.
- `api_token` is their secret. Ask for it, never invent one.

Ask the user how to narrow it, rather than choosing yourself:

- `ticket_age`: how far back to read by creation date, in months (`1m` to
  `36m`) or `all`. Left out, this reads every issue ever filed, which on a
  large site is a lot of content.
- `projects_include`: which project keys (such as `ENG`) to read, or all.
- `status_include`, `resolution_include` and `issuetype_include`: the names
  from the matching list tool, to read only resolved bugs, for example.
  Left out, each reads every value.

## What it holds

Jira issues are problem histories, so they answer "has this come up before"
rather than "how does this work". Tell the user that if they are choosing
between sources.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
