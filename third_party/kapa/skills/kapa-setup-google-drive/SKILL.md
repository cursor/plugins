---
name: kapa-setup-google-drive
description: Set up a Kapa Google Drive source so documents in a Drive are ingested. Use when the user wants Kapa to answer from files in Google Drive or a shared drive.
---

# Set up Google Drive

Connects through OAuth, so the user approves it in their browser.

Unlike the other OAuth sources, the grant belongs to the **signed-in user, not
the source**, and configuring a source uses it up. Connect again for each
Google Drive source, and never run two Google Drive setups at the same time.

## 1. Create the source

`create_google_drive_source` with `project` and `name`. Keep the returned id.

## 2. Connect the Drive

`connect_google_drive` takes no arguments and returns the URL the user
approves at.

**Open that URL in the user's browser** and ask them to approve it.

## 3. Wait for the user, then check once

The approval happens in the browser, so there is nothing to poll. Ask the user
to tell you when they have approved it, then call
`check_google_drive_connection` **once**. It answers with the Google account
that approved, or nothing if they have not finished.

## 4. Choose what to ingest

`list_google_drive_folders` and `list_google_drive_files` show what the
connected account can see. Both answer with at most 20 results, so pass `name`
to search rather than expecting the whole Drive back.

Ask the user which folders or files to ingest, and use these tools to turn
their answer into ids. There is no "everything" option: the source reads only
the folders and files you name.

## 5. Configure it

`configure_google_drive` with `source_google_drive` and the ids:

- `folder_ids_include` and `file_ids_include` take what to read. They add up:
  named files are read on top of the files in named folders.
- `folder_ids_exclude` and `file_ids_exclude` drop things from a wider set.
- Pass at least one folder or file to include. With none, the configuration
  saves but ingests nothing.

No credential travels here. The connection supplies the token and the account
email, so never ask the user for either.

## What gets ingested

Google Docs, Sheets and Slides are read as documents. A file the connected
account cannot open is skipped.

## When it ingests nothing

The approving account cannot see the folders you configured. Drive permissions
belong to the person who approved, so a folder shared with the team but not
with them is invisible. Have the user check their own access before changing
the configuration.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
