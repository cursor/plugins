---
name: kapa-setup-discord
description: Set up a Kapa Discord source so a Discord channel's threads are ingested. Use when the user wants Kapa to answer from conversations in their Discord server.
---

# Set up Discord

No token here: Kapa runs its own Discord app. The user still has to add it to
their server.

## 1. The out-of-band setup

Tell the user to:

1. Add the Kapa Discord bot to their server.
2. Turn on **Developer Mode** in Discord: User Settings, then Advanced.
3. Right click the channel and choose **Copy Channel ID**.

Step 2 is the one people miss: without Developer Mode the Copy Channel ID
option does not appear at all.

Use a **forum channel**. Discord ingestion is thread oriented, so a plain text
channel is not what this is for.

## 2. Create the source

`create_discord_source` with `project` and `name`. Keep the returned id.

## 3. Check the channel

`validate_discord_channel` with `channel` confirms the Kapa bot can read it.
It answers HTTP 200 even on failure, with a `type` of `error` rather than
`channel`, so read the body rather than the status.

A failure here means the bot is not in the server, or the channel is not a
forum channel. There is no token to be wrong.

`list_discord_users` then shows who is in the channel, which is how to turn
"our support team" into the `support_user_ids` the config takes.

## 4. Configure it

`set_discord_config` with `source_discord` and `channel_id`.

One source covers one channel.

## Getting good answers out of it

- `support_user_ids` marks whose replies count as answers. Ask which people or
  roles are their support team.
- `include_only_threads_with_support_user_answers` limits ingestion to threads
  one of those people replied to. Ask whether they want that.
- `users_to_exclude` leaves out messages from these user ids, typically bots.
  `list_discord_users` turns names into ids. It lists everyone who can view
  the channel, not only people who posted.
- `thread_age` limits how far back to read, in months: `1m` to `36m`, or
  `all`.

## When it ingests nothing

The Kapa bot is not in the server, or cannot see that channel.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
