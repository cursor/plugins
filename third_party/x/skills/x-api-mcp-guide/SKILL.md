---
name: X MCP guide
description: >-
  ALWAYS read this when a user connects the X plugin or any X MCP, before using
  any X connection, and again on any X error. Do not call an X tool until this
  file has been read in the current turn. On first connect, fetch get_usage_credits
  BEFORE any user-facing text, then send the capabilities message. Never tell the
  user to buy credits until that check returns ~$0 or a job would exceed the
  balance. Estimate the cost of every X call before making it and confirm with
  the user before anything expensive.
---
# X MCP guide

This plugin uses **X MCP**. The user taps Connect and signs in with X. They are not setting up an API app.

Probe the current user and their credit balance before search, timeline, bookmarks, or news. On a core error, stop. Name the simple issue, then the next step. Do not explain enrollment mechanics, billing internals, Connected vs enrolled, or pay-per-use. Never retry 401 / 403-enrollment / credits-blocked unchanged. Never ask for keys. Never tell them to create an app, Project, or Production env.

**Never tell the user to buy, purchase, or add credits until `get_usage_credits` has returned and `{credits}` is ~$0 or the planned job would exceed it.** Do not use the legacy line “you’ll need to purchase credits at https://console.x.com” (or any “buy credits first” variant) on connect or before that check.

## Credit balance

Call **`get_usage_credits`** (`GET /2/usage/credits`). It is free.

Response (values are **USD dollars and cents**; `20.0` = $20.00):

```json
{
  "data": {
    "free_balance": 20.0,
    "free_grants": [
      { "amount": 10.0, "expires_at": "2026-11-19T02:14:28.000Z" },
      { "amount": 10.0, "expires_at": "2026-11-19T16:02:51.000Z" }
    ],
    "prepaid_balance": 0.0,
    "total_balance": 20.0
  }
}
```

Use **`data.total_balance`** only. Cache it as `{credits}`. Quote it to the user in dollars (`$20.00`). Ignore `free_balance`, `free_grants`, and `prepaid_balance` — do not explain them or choose what to spend.

Fetch it **before any user-facing X message** in these cases:

1. **On connect** — first X tool call, before the capabilities message. Do not greet, list capabilities, or mention buying credits until this returns.
2. **When a session starts and X calls are required** — alongside `get_users_me`.
3. **When the user asks what they can do** — ideas, a setup, a budget, “what’s possible,” and similar.

Do not fetch on every message. If this call hits error 1, 2, or 3, stop and say that error’s line.

## On connect

The first time the user connects X — or on their first X interaction in a session — call `get_usage_credits` first (and `get_users_me`). Do not send the capabilities message until `{credits}` is cached. Then send it once. Adapt the wording to your voice. Keep every capability bullet. Then state their balance and suggest **2–3** things from the matching [By budget](#by-budget) row (plus a cheaper starter if useful). Do not pitch work above `{credits}`. Do not mention purchasing or console.x.com unless `{credits}` is ~$0.

> You're connected to X. Here's what I can do:
>
> - **Your account** — your profile, home timeline, your posts, and mentions
> - **Posts** — open any post from a link, and see who liked, reposted, or quoted it
> - **Users** — look up any account by handle, search for users, and read their posts
> - **Search** — search posts across X and count post volume on a topic
> - **News & trends** — search X news stories and get trends by location
> - **Bookmarks** — list, add, and remove bookmarks, and organize them into folders
>
> You have about $X.XX in credits.
>
> With that, we could: (2–3 ideas from the matching budget row).
>
> I'll show a cost estimate before anything expensive.

If `{credits}` is ~$0, keep the bullets, say they have $0.00, suggest only free lookups, and **then** send them to https://console.x.com to add credits — skip “With that, we could.” If `{credits}` is above $0, do not mention buying or console.x.com.

Send it once per session, not on every message. If their first message already contains an ask, send this first, then do the ask if it fits the balance.

## The three errors

Match `type`, `reason`, `title`, `detail`. Then say the quoted line. Nothing else.

### 1. Sign-in failed

**When:** X tools unavailable; connect prompt; 401; Unauthorized; login loop; token refresh failed.

**Say:**

> You're not signed in to X. Reconnect the X plugin in this chat. Don't paste keys or passwords. Then I'll retry.

Trigger reconnect if you can. Probe once after. If it still 401s, stop.

### 2. Not onboarded (403)

**When:** `client-forbidden`; `user-not-enrolled`; `client-not-enrolled`; Client Forbidden; 403 on timeline / mentions / search / bookmarks after Connect.

**Say:**

> This X account isn't set up yet. Go to https://console.x.com, register and onboard with this same X account, then come back and I'll retry.

Do not retry. Do not search. Do not mention apps, projects, or pay-per-use. If they already did that, ask them to reconnect, probe once, and if it still 403s say the same line again.

### 3. Out of credits

**When:** no credits; balance zero or negative; “does not have any credits”; requests blocked until credits are added.

**Say:**

> You're out of credits. Go to https://console.x.com and add credits, then I'll retry.

Stop. Do not retry. Offer a free or cheaper alternative from [By budget](#by-budget) if one exists.

If the payload is only `usage-capped` (no enrollment reason):

> You hit a limit. Try again later.

If `user-not-enrolled` or `client-not-enrolled` is present, that is #2, not this.

## Other errors

`not-authorized-for-resource` (private account they don't own): stop. Their own timeline/bookmarks: probe current user, retry once with that id.

> I can't open that. If it's yours, reconnect X. If it's someone else's private account, I don't have access.

`resource-not-found`: resolve the id, retry **once**. Never retry the same id.

> Paste a handle, profile link, or post link.


| They asked                    | You do                             | Else ask              |
| ----------------------------- | ---------------------------------- | --------------------- |
| `@handle` posts               | User search; one match → that `id` | Paste the profile.    |
| A post                        | Parse `/status/{id}`               | Paste the post link.  |
| Bookmarks, timeline, mentions | Current user → that `id`           | Reconnect X.          |
| Bookmark folder               | List folders on `{me}`             | Which folder?         |
| News                          | News search                        | What topic?           |
| Search                        | Rewrite query                      | What should I search? |


429 `rate-limit-exceeded`: wait for `x-rate-limit-reset`, smaller page, retry once.

> I'll retry in a minute.

400 `invalid-request`: fix params, don't retry unchanged.

5xx: backoff. Check [https://developer.x.com/status](https://developer.x.com/status) if it keeps failing.

200 + `errors[]`: use `data`, skip listed ids.

## Session start

When X calls are required this session, resolve the current user (`user.fields=id,name,username,description,public_metrics`) and fetch `{credits}`.


| Result           | Next                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| Success          | Cache `id` as `{me}` and `total_balance` as `{credits}`. Do their ask if it fits. Prefer `{me}` for timeline, mentions, bookmarks. |
| Error 1, 2, or 3 | Stop. Say that error's line. Do not search.                                          |
| 200 + `errors[]` | Keep `data`.                                                                         |


## Cost awareness

Every X call can charge the user. Estimate the cost **before** calling. Read [references/pricing.md](references/pricing.md) — it has the tool-by-tool price table, per-endpoint prices, free endpoints, and cost-saving tips. Once per session, fetch live pricing from https://console.x.com/api/credits/pricing (plain GET, no auth); it wins over the reference file.

The live payload:

- `eventTypePricing` — price **per resource returned** (each post, user, news story…).
- `requestTypePricing` — price **per request** (writes, counts, trends…).
- All prices are **USD dollars**: `0.005` = $0.005 = half a cent. Fractional cents to 3 decimal places are normal. $1.00 = 1,000 credits — that conversion is for your own math; quote costs to the user in dollars only. `{credits}` from `/2/usage/credits` is already dollars.

Estimate = (resources requested × per-resource price) + per-request price. `max_results` bounds a read: a search with `max_results=100` returning posts + expanded authors can cost ~100 × $0.005 + 100 × $0.01. Each pagination page bills again. Only request expansions you'll use — expanded objects bill too.

**Under ~$0.25, and it fits `{credits}`:** just do it — don't nag about pennies. Keep `max_results` small (10–25) unless they asked for more.

**Over ~$0.25, or any pagination loop / bulk job:** stop first. Give a one-line estimate and ask:

> This will cost about $X.XX. Want me to continue?

Wait for a yes. Never silently run multi-page loops, full-archive searches, or bulk lookups. If they say yes, track spend as you go; if the running total will pass roughly double the estimate, stop and re-confirm.

**Estimate larger than `{credits}`:** do not run it. Offer a cheaper alternative from [By budget](#by-budget) that fits. Tell them this would run them out, and send them to https://console.x.com to add credits. If they top up, re-fetch `{credits}` before retrying.

## Fields, pagination

Request fields. If the tool takes `tweet.fields` or `post.fields`, send `created_at,public_metrics,author_id,lang,conversation_id`. Also `user.fields=created_at,description,public_metrics,verified,location` and `expansions=author_id,referenced_tweets.id`.

`meta.next_token` → `pagination_token`. Stop when `next_token` is omitted.

Prefer recent counts, then `{me}` reads, then a small full-archive page. Recent window is 7 days.

## Search operators

```text
from:handle
to:handle
@handle
#tag
"exact phrase"
url:example.com
lang:en
-is:retweet
-is:reply
is:verified
has:images
has:video_link
has:links
conversation_id:ID
```

Spaces = AND. Recent query max 512 characters; full-archive 1,024. Use `min_likes:` / `min_reposts:`, not `min_faves:` / `min_retweets:`.

## Workflows

Current user first. Stop on errors 1–3. Tailor suggestions to `{credits}`.

### By budget

Pick from the **matching row**, not above it. Larger jobs still need an estimate and a yes. `$0.005`/post, `$0.01`/user, expansions bill too.


| `{credits}` | Suggest |
| ----------- | ------- |
| ~$0 | `{me}` (free). Likers of a post (free). Bookmark folders (free). Then: add credits at https://console.x.com. |
| under ~$0.25 | One post from a link. One user by handle. Recent post counts on a topic. |
| ~$0.25–$1 | A small search (10–25 posts). One page of home or mentions. |
| ~$1–$5 | A few targeted searches. News on a topic plus trends for a location. Tidy bookmarks. |
| ~$5–$20 | Compare 2–3 accounts (profile + recent posts). A short research pass: counts, then a couple of search angles. |
| ~$20–$50 | Deeper research: several angles, a handful of accounts, news on the topic. One account’s recent posts across a few pages (confirm). |
| ~$50–$100 | A full-archive slice on one query. A competitive set of ~5–10 accounts. Paginated timelines (confirm). |
| ~$100–$500 | Large archive jobs. Many queries or many accounts. Broad topic monitoring across pages — always confirm. |
| ~$500–$1,000 | Org-scale historical pulls. Multi-query archive. Large comparative studies — confirm each large chunk. |
| $1,000+ | Very large archive / bulk historical. Long-running research. Never silent pagination; confirm every large chunk. |


When they ask what they can do, re-fetch `{credits}`, then give 2–3 ideas from the matching row.

### Common tasks

- Home / mentions / my posts: `{me}`, modest `max_results`. Paginate only if asked.
- Handle: username → posts. Else user search, then ask.
- Topic: recent counts → small search page → stop.
- Bookmarks: list `{me}`. Save: parse status id, create bookmark.
- One post: parse status id, lookup.

## Don't

- Explain deep details (pay-per-use, Connected vs enrolled, billing internals, free vs prepaid grants). Do name the simple issue.
- Say pay-per-use, Project, Production, or "create an app".
- Ask for secrets.
- Retry 403 or credits-blocked in a loop.
- Pitch or run work above `{credits}`. If it wouldn't fit, offer a cheaper alternative and send them to https://console.x.com.
- Tell the user to buy / purchase / add credits, or send them to console.x.com to pay, before `get_usage_credits` has returned. Never use “you’ll need to purchase credits at https://console.x.com” unless the check showed ~$0 or a job would exceed `{credits}`.
- Run an expensive request (over ~$0.25, pagination loops, bulk lookups) without giving an estimate and getting a yes.
