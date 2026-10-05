---
name: kapa-setup-github-files
description: Set up a Kapa GitHub files source so documentation files in a repository are ingested. Use when the user wants Kapa to answer from Markdown or other files in a GitHub repo.
---

# Set up GitHub files

Ingests files from a repository. This is the GitHub source to use when the
repo holds documentation.

## 1. Create the source

`create_github_files_source` with `project` and `name`. Keep the returned id.

## 2. Configure it

`set_github_files_config` with `source_github_files`, `repo_owner`, `repo_name`
and `file_extensions`.

`repo_owner` and `repo_name` together make the repository path. For
`github.com/acme/docs`, the owner is `acme` and the name is `docs`.

`personal_access_token` is **required only for a private repository**. Do not
ask for one for a public repo. If you do need it, it is the user's secret: ask,
never invent one, and tell them it needs the `repo` scope.

`file_extensions` is required, so ask which file types to read. `md` and
`mdx` cover most documentation; source code extensions pull in the code
itself, which some teams want and others do not.

Ask about these too:

- `include_paths`: restrict to a directory, or read the whole repository.
- `ref`: a branch or tag to read, or the default branch.

## When it ingests nothing

A private repo without a token, a `ref` that does not exist, or
`file_extensions` that match no file in the paths you restricted to.

## Check the repository first

`validate_github_files_repo` with `repo_owner`, `repo_name` and, for a private repo,
`personal_access_token`. It answers HTTP 200 with `false` when the repo cannot
be reached, so read the body rather than the status.

A false covers all of: the repo does not exist, it is private and the token is
missing, or the token lacks the `repo` scope. Offer those to the user rather
than guessing which.

`list_github_files_repo_tree` then shows the file tree, so you can show real directories and file types.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
