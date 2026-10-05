---
name: kapa-setup-github-discussions
description: Set up a Kapa GitHub discussions source so repository discussions are ingested. Use when the user wants Kapa to answer from Q&A in GitHub Discussions.
---

# Set up GitHub discussions

Discussions are typically questions with answers, so they read closer to a
knowledge base than issues or pull requests do.

## 1. Create the source

`create_github_discussions_source` with `project` and `name`. Keep the id.

## 2. Configure it

`set_github_discussions_config` with `source_github_discussions`, `repo_owner`
and `repo_name`.

`repo_owner` and `repo_name` together make the repository path. For
`github.com/acme/docs`, the owner is `acme` and the name is `docs`.

`personal_access_token` is **required only for a private repository**. Do not
ask for one for a public repo. If you do need it, it is the user's secret: ask,
never invent one, and tell them it needs the `repo` scope.

## Check the repository first

`validate_github_discussions_repo` with `repo_owner`, `repo_name` and, for a private repo,
`personal_access_token`. It answers HTTP 200 with `false` when the repo cannot
be reached, so read the body rather than the status.

A false covers all of: the repo does not exist, it is private and the token is
missing, or the token lacks the `repo` scope. Offer those to the user rather
than guessing which.

`list_github_discussions_categories` then shows the discussion categories.

## Let the user choose the filters

Show these options and ask. Do not pick for them and do not apply a default
silently.

- `include_only_answered_discussions`: keep only discussions with an accepted
  answer, or take every discussion including unanswered ones.
- `categories`: restrict to specific categories, or leave out for all.
- `discussion_age`: how far back to read, or all history.

Say what each does, then set what they asked for.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
