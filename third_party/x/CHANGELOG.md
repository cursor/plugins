# Changelog

All notable changes to this plugin will be documented here.

## 2.6.3 — Built-in public reads, unread state, no congrats line

- Built-in public reads need no X connection, credits check, or cost estimate. Grok Bot reads public posts, users, search, trends, and news on its own, and a missing `get_usage_credits` or `get_users_me` next to those reads is not an error.
- For "what's unread", list unread conversations with `get_chat_conversations` `unread_only` true and the `unread,last_read_event_id,newest_event_id` fields, paging until `meta.has_more` is false (pages can be short or empty), instead of scanning every conversation. Unread messages are the events after `last_read_event_id`.
- The on-connect message no longer opens with "Congrats, you've received free X API credits to get started!". It starts with the capabilities list and still states the remaining balance.

## 2.6.2 — Focus X Chat summaries on the message

- When showing or summarizing messages, focus on the content. Don't add encryption-status commentary unprompted, and don't describe plain messages as odd or a problem: threads with no conversation key normally carry plain DMs, including recent ones. If the user asks about encryption, verification, or security, answer plainly from `status`. Mention `unverified` briefly when it's relevant, e.g. before acting on that message.

## 2.6.1 — Ask about remembering the X Chat key separately

- When a Chat PIN is needed, the remember question is a separate Yes/No question widget sent alongside the PIN request. `--remember-key` is added only on a clear Yes. No does not save the key. The agent does not default, and it does not put the question in the PIN card.

## 2.6.0 — Remember the X Chat key and read every chat

- Every Chat PIN request also asks whether to remember the X Chat key on this computer so the owner won't need the PIN next time, noting that anyone with access to the computer could then read their X Chats. Default is no. When a saved key works, the agent uses it without asking for the PIN and mentions that `forget` removes it.
- Read every conversation and both message request inboxes, not only the relevant ones, with conversation ids exactly as returned. A chat 503 is retried with the same `pagination_token` up to 3 times and never ends a thread.
- Answer from each message's display text and content. The helper gives every message readable text, including media, reactions, edits, calls and Grok replies, and a row with placeholder text for any event it can't decode.

## 2.5.2 — Read unencrypted X Chat messages

- Threads can include older unencrypted messages. The helper's `decrypt` accepts every event and marks each message `verified`, `unencrypted`, or `unverified`. An unverified message still includes its text when it could be decrypted; only a message that cannot be decrypted comes back without text. Existing helper clones are pulled so they pick this up. Replies are still always encrypted.
- Fetch signing keys for every sender and group member with `get_users_public_keys` (up to 100 ids per call, all key versions). The helper takes the entries as returned and skips incomplete ones.
- A page with `result_count: 0` that still has a `next_token` is not an empty thread: keep paging, at least 20 events per page. Dropped the encrypted-only framing, the hint that empty `data` can mean an empty thread, and the advice to keep `max_results` small. Agents must not claim they checked all chats unless they read every thread to the end.
- X Chat is free for this plugin. Do not estimate cost, ask for confirmation, or check credits for conversation and event reads, public key lookups, `add_conversation_keys`, `send_chat_message`, typing indicators, or marking a conversation read. Page the inbox and each relevant thread at `max_results` 100 until `next_token` is absent.

## 2.5.1 — X Chat in the always-read MCP guide

- Folded the X Chat companion skill into the X MCP guide so GrokBot loads Chat / inbox / DMs without a second skill. Clone `xchat_lite.py` from https://github.com/xdevplatform/xchat-grokbot-helper yourself — do not wait for the user to name the helper.
- Removed `skills/x-chat/`. Secret-request Chat PIN only, decrypt/encrypt locally, MCP for ciphertext.

## 2.5.0 — X Chat skill (read / reply)

- Added the X Chat companion skill: clone `xchat_lite.py` from https://github.com/xdevplatform/xchat-grokbot-helper, secret-request Chat PIN only, decrypt/encrypt locally, MCP for ciphertext. Owner must approve outbound text unless they already said to send.
- Missing Chat tools or `dm.read` / `dm.write` while other X tools work: reconnect the X plugin (not create a Project/App, not a Bearer token). On-connect capabilities now include Chat (not posting tweets).

## 2.4.0 — X Chat scopes

- Requested `dm.read` and `dm.write` so agents can call X Chat endpoints on `https://api.x.com/mcp`.
- Existing installs need to sign in to X again to pick up the new scopes.

## 2.3.0 — Auto credits, missing-tools failure, never pay first

- Developer accounts are auto-created and auto-credited. On connect, agents confirm X tools exist, fetch `get_usage_credits`, then congratulate with “you've received free X API credits to get started” (no dollar amount). Starter amounts by plan (Ultra $100, SuperGrok Plus $50, Pro+ $30, Pro $10) only if the user asks how much they received. Remaining balance (`total_balance`) is for budgets and “what's left.”
- Connected-but-no-tools (`user-X-*` not found, `tools=0`) is the account-not-ready failure: clear/reinstall the X connection, then console.x.com developer account + Default Project + App if it still fails. Old 403 enrollment is the same error. Do not treat this as a paywall.
- Never tell the user to buy credits until after `get_usage_credits`. ~$0 remaining still goes to https://console.x.com. Added budget-tier workflows keyed off `total_balance`.
- Do not sign in via the agent browser or ask for Bearer tokens — X plugin Connect only.

## 2.2.0 — developer scopes

- Requested `developer.write` and `developer.billing.write`, and dropped `billing.write`, matching the scopes the X MCP server now advertises at `https://api.x.com/.well-known/oauth-protected-resource/mcp`.
- Existing installs need to sign in to X again to pick up the new scopes.


## 2.1.0 — X MCP guide skill

- Added the X MCP guide skill: tells agents how to handle sign-in, onboarding, and out-of-credits errors with simple user-facing messages, plus session-start, search, pagination, and cost-aware workflow rules.

## 2.0.0 — OAuth user sign-in, no longer read-only

- Replaced the `X_BEARER_TOKEN` app-only route with OAuth user sign-in using X's client ID `NGdZYmo4VVp2T1BnRG55NlExOGQ6MTpjaQ`.
- Requested scopes: `tweet.read`, `users.read`, `follows.read`, `space.read`, `mute.read`, `like.read`, `list.read`, `list.write`, `block.read`, `block.write`, `bookmark.read`, `bookmark.write`, `billing.write`, `offline.access`.
- Agents can now manage lists, bookmarks, blocks, and mutes in your user context. Posting is still not possible (`tweet.write` is not requested).
- Removed the `X_BEARER_TOKEN` plugin variable — no credential to paste anymore.

## 1.0.0 — initial release

- Logo: X's official mark from the X brand toolkit, on a black tile matching X's own app icon.
- Added the `x` MCP server pointing at `https://api.x.com/mcp`.
- Declared the `X_BEARER_TOKEN` plugin variable and forwarded it through the Authorization header, using X's app-only Bearer route so the server stays read-only and needs no local bridge.
