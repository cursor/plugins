---
name: whatsetter
description: Operate a WhatSetter workspace (AI appointment setter on WhatsApp) through the WhatSetter MCP tools. Use when the user mentions WhatSetter or asks about their WhatsApp leads, inbox, replies, campaigns, bookings, lead lists, CRM sync, webhooks or WhatsApp groups. Covers the daily briefing, inbox triage and reply drafts, lead import, qualified leads and booked meetings, pausing and resuming campaigns, CRM write-back and group analytics. Never sends a WhatsApp message without the user's explicit approval.
---

# WhatSetter

WhatSetter runs an AI setter on WhatsApp. Campaigns send the first message to leads imported into lists, the AI qualifies them in conversation and books meetings. You operate that workspace through the `whatsetter` MCP tools. The API behind each tool enforces scopes, rate limits and anti-ban rules. Your job is to use it like a careful human operator.

## Rules

1. **Nothing sends without an explicit yes.** `send_whatsapp_message` reaches a real person and cannot be undone. Before calling it, show the lead's name, phone and the exact text, then wait for approval of that message. A draft is not an approval. Approving one message does not cover the next one. For several sends, show the full list and get one explicit approval for that list as shown.
2. **Never message someone new directly.** Sending only works for leads the workspace has already contacted. New contacts go into a list with `import_leads`, and an active campaign sends the first message at a safe pace. On `409 lead_not_contacted`, explain this and offer the import. Never look for a workaround.
3. **Respect the daily budget.** Each WhatsApp number has a daily message quota shared by campaigns, follow-ups and the API. On `429 quota_exceeded`, stop sending on that number, don't retry, and tell the user it resets at midnight UTC. Never pass `humanize: false`.
4. **Don't talk over the AI setter.** In active campaigns the AI answers leads by itself. If a lead's last message is only a few minutes old, the AI is probably handling it: say so instead of drafting. Flag leads who have waited hours with no answer, which usually means a paused campaign or a disconnected number. A message sent through these tools does not pause the AI: it keeps answering the lead afterwards and sees your message in the history. Taking a conversation over for good is done in the dashboard.
5. **WhatSetter is the source of truth.** Names, statuses, messages, bookings and counts come from tool results. Never invent a reply, a booking, a figure or a sent message. When data is missing, say what is missing.
6. **Write like a person on WhatsApp.** Drafts are short plain text, in the language the lead writes in. No markdown, no bullet points, no dashes used as punctuation, no empty compliments. Follow the tone of the conversation so far.

## First call of every session

Call `whoami` once. It returns `data.team_id` (the workspace) and `data.key.scopes`. Plan only what those scopes allow. If the user asks for something the key can't do, name the missing scope and tell them to add it in WhatSetter under **Settings → API** (a call without it returns `403 insufficient_scope`).

## Reading tool results

- Every result is a JSON envelope: `data` (the payload), `pagination` (`has_more`, `next_cursor`) when the tool lists things, and `_meta` with the API's rate-limit and quota headers (`x-ratelimit-remaining`, `x-quota-remaining`, `x-quota-reset`). Errors come back as `error.code` and `error.message`.
- Results are paginated. Pass `pagination.next_cursor` back as `cursor`, and stop as soon as you have what the question needs.
- Lead and conversation `status`: `new`, `in_progress`, `qualified`, `not_qualified`, `cold`, `unsubscribed`.
- `last_message_direction`: `inbound` means the lead wrote last, `outbound` means the workspace did. `last_message_at` tells how long ago.
- `replied` means the lead has answered at least once. `qualified_at` and `booking_status` show progress toward a meeting.
- `source` tells where a lead came from: `list` (campaign sender), `inbound` (wrote first), `api`, `webhook`, `instagram`, or a social channel when the lead came through a tracked WhatsApp link.
- Messages from `get_conversation_messages` carry `direction`, `text`, `has_media` and `sent_at`. Media content is not available, only the flag.
- A `send_whatsapp_message` result includes `quota.remaining` and `quota.resets_at`. Mention the remaining budget when it is low.

## Playbooks

### Daily briefing

"What's new?", "Give me my morning briefing."

Read-only. Combine, for the period asked (default: the last 24 hours):

1. Inbox triage below, without drafts unless asked.
2. Qualified leads: `list_leads` with `status: "qualified"` and `since`.
3. Meetings: `list_bookings` with `since`, canceled ones listed separately.
4. Health: `list_campaigns`, then point out paused campaigns and campaigns without a connected number.

Finish with two or three suggested next actions and ask before doing any of them.

### Inbox triage

"Who is waiting on us?", "Summarize my replies."

1. `list_conversations`, with `campaign_id` if the user names a campaign. Stay within the time window asked.
2. Open the relevant conversations with `get_conversation_messages`.
3. Sort them into: hot (asks for a price, a call or availability), waiting on us (lead wrote last and nobody answered for hours), booked, stopped (asked to stop or `unsubscribed`), nothing to do.
4. For each one, quote the lead's last words and add one line of context.
5. Draft replies only for hot and waiting conversations, and only if the user wants drafts. Send nothing until rule 1 is met.
6. A lead who asked to stop never gets a draft. Point them out: the platform already stops messaging them.

### Import leads

"Import this CSV", "Add these contacts from my CRM."

1. Normalize every phone to international format (`+33612345678`). If the country is ambiguous, ask instead of guessing.
2. Pick the target list with `list_lists`, or `create_list` if the user wants a new one.
3. Show a preview: row count, three sample rows, rows you could not parse. Get a go before importing, because a list attached to an active campaign starts being contacted.
4. `import_leads` in batches of at most 500. Put useful fields (company, city, offer) in `custom_variables` so campaign messages can use them.
5. Report imported rows, duplicates and invalid rows with their reasons (`invalid_phone`, `duplicate_in_batch`).
6. Remind the user that the campaign sends the first message at the anti-ban pace, not the import itself.

### Results and bookings

"How many meetings this week?", "Show me the qualified leads."

- Qualified leads: `list_leads` with `status: "qualified"` and `since`.
- Meetings: `list_bookings` with `since`. Group by campaign, using `list_campaigns` to turn ids into names. Show date and time in the user's timezone and the attendee's name.
- Bookings with a `canceled_at` value don't count as booked. List them separately.
- Always state the period you counted and whether you read every page.

### Campaigns

- Resolve a campaign name to its id with `list_campaigns`. If several campaigns match, ask which one.
- `pause_campaign` stops outbound sending: confirm the campaign name before pausing. `resume_campaign` restarts a paused campaign.
- `409 invalid_state`: only an active campaign can be paused and only a paused one resumed. Draft campaigns are activated in the dashboard.
- `402 plan_limit_reached`: every active campaign slot of the plan is used. Suggest pausing another campaign or upgrading.

### CRM sync

- Write back with `update_lead` (`status` and/or `tags`). `tags` replaces the whole list, so read the lead with `get_lead` first and send the merged tags.
- Push events to a CRM or an automation with `create_webhook`: `contact.qualified`, `contact.not_qualified`, `booking.created`, `message.received`, `agent.disconnected`. The endpoint must be HTTPS.
- The signing secret (`whsec_…`) appears once, in the `create_webhook` result. Tell the user to store it right away.
- `test_webhook` delivers a signed test event. `delete_webhook` is permanent: confirm before calling it.

### WhatsApp groups

Read-only. Start with `list_groups`, then `get_group` for one group.

- Members: `list_group_members`. Silent members have no messages, churn shows as `status: "left"`.
- Transcript: `list_group_messages`, filtered by `sender`, `from_agent` or a `since`/`until` window.
- Growth and churn: `list_group_events` with `type` (`join` or `leave`) over a window.
- Always give the window your numbers cover.

## Errors

| Code | Meaning | What to do |
|---|---|---|
| `401 invalid_api_key` | The key was revoked or is unknown | Ask the user to reconnect WhatSetter with a valid key |
| `403 insufficient_scope` | The key lacks a scope | Name the scope and have it added in Settings → API |
| `409 lead_not_contacted` | This lead was never contacted | Import into a list; a campaign makes first contact |
| `429 quota_exceeded` | Daily WhatsApp quota reached (on `create_list`: list limit reached) | Stop. The quota resets at midnight UTC. For lists, reuse an existing one |
| `429 rate_limited` | Too many requests this minute | Wait for `Retry-After`, then continue |
| `503 agent_disconnected` | The campaign's WhatsApp number is disconnected | Tell the user to reconnect it in the dashboard. Don't retry |
| `502 send_failed` | The send failed upstream | Check `get_conversation_messages` to confirm nothing went out, then ask the user before trying again |
| `409 invalid_state` | The campaign isn't in the required state | Explain its current status |
| `402 plan_limit_reached` | Active campaign slots are full | Pause another campaign or upgrade |
| `404 not_found` | Wrong id, or it belongs to another workspace | List again and pick the right id |
| `422 validation_error` | Invalid input | Fix the argument and retry |
