---
name: kapa-setup-slack
description: Set up a Kapa Slack source so a Slack channel's threads are ingested. Use when the user wants Kapa to answer from conversations in their Slack workspace.
---

# Set up Slack

## 1. The out-of-band setup, which is where this usually fails

Tell the user to:

1. Create a Slack app at https://api.slack.com/apps and install it to the
   workspace.
2. Copy its **bot token**, which starts `xoxb-`.
3. **Invite the bot into the channel.** A bot that is not a member reads
   nothing, and a private channel requires it.

Step 3 is the one people miss.

## 2. Get the channel id

`channel_id` is the id, not the name. In Slack, open the channel, choose View
channel details, and copy the id at the bottom. It starts with `C`.

## 3. Create the source

`create_slack_source` with `project` and `name`. Keep the returned id.

## 4. Check the token and the channel

`validate_slack_token` with `bot_token` confirms the token itself.

`validate_slack_channel` with `channel` and `bot_token` confirms the bot can
actually read that channel, which is the step that catches a bot that was
never invited. It answers HTTP 200 even on failure, with a `type` of `error`
rather than `channel`, so read the body rather than the status.

`list_slack_users` then shows who is in the channel, which is how to turn "our
support team" into the `support_user_ids` the config takes.

## 5. Configure it

`set_slack_config` with `source_slack`, `channel_id` and `bot_token`. The token
is the user's secret: ask for it, never invent one.

One source covers one channel, so set up several for several channels.

## Getting good answers out of it

Community threads contain wrong answers as well as right ones.

- `support_user_ids` marks whose replies count as answers. This is how Kapa
  tells a maintainer's answer from a guess, so ask which people are their
  support team.
- `include_only_threads_with_support_user_answers` limits ingestion to threads
  one of those people replied to. Ask whether they want that.
- `users_to_exclude` leaves out messages from these user ids, typically bots.
  `list_slack_users` turns names into ids.
- `thread_age` limits how far back to read, in months: `1m` to `36m`, or
  `all`. Old threads often describe versions that no longer exist.

## When it ingests nothing

The bot was never invited to the channel. Check that before changing the config.

## Finish the job

Saving the configuration starts ingestion. There is no separate publish step,
so once the config saves the source is live.

Then call `list_sources` with `project_id` to confirm what the project holds.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
