---
name: kapa-setup-github-pull-requests
description: Set up a Kapa GitHub pull requests source so repository pull requests are ingested. Use when the user wants Kapa to answer from changes and review discussion in GitHub PRs.
---

# Set up GitHub pull requests

Pull request discussion is largely about implementation rather than usage, so
say that when offering it: it suits a team that wants change history, and
suits a user-facing assistant less well.

## 1. Create the source

`create_github_pull_requests_source` with `project` and `name`. Keep the id.

## 2. Configure it

`set_github_pull_requests_config` with `source_github_pull_requests`,
`repo_owner` and `repo_name`.

`repo_owner` and `repo_name` together make the repository path. For
`github.com/acme/docs`, the owner is `acme` and the name is `docs`.

`personal_access_token` is **required only for a private repository**. Do not
ask for one for a public repo. If you do need it, it is the user's secret: ask,
never invent one, and tell them it needs the `repo` scope.

## Check the repository first

`validate_github_pull_requests_repo` with `repo_owner`, `repo_name` and, for a private repo,
`personal_access_token`. It answers HTTP 200 with `false` when the repo cannot
be reached, so read the body rather than the status.

A false covers all of: the repo does not exist, it is private and the token is
missing, or the token lacks the `repo` scope. Offer those to the user rather
than guessing which.

`list_github_pull_requests_labels` then shows the repository's labels.

## Let the user choose the filters

Show these options and ask. Do not pick for them and do not apply a default
silently.

- `pr_state`: which states to read. Merged pull requests describe changes that
  shipped, ones closed without merging describe changes that did not, and open
  ones are still in flight.
- `pr_age`: how far back to read, or all history.
- `labels`: restrict to specific labels, or leave out for all.

Say what each does, then set what they asked for.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
