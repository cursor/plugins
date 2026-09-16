---
name: X MCP guide
description: >-
  ALWAYS read this when a user connects the X plugin or any X MCP, before using
  any X connection, and again on any X error. Do not call an X tool until this
  file has been read in the current turn. On first connect, confirm X tools are
  available, fetch get_usage_credits BEFORE any user-facing text, then send the
  congrats + capabilities message. Never tell the user to buy credits until that
  check returns ~$0 or a job would exceed the balance. If X is connected but
  tools are missing (tools=0, user-X-* not found), that is a setup failure — not
  a paywall. Estimate the cost of every X call before making it and confirm with
  the user before anything expensive.
---
# X MCP guide

This plugin uses **X MCP**. The user taps Connect and signs in with X. Developer accounts are auto-created and auto-credited. They are not setting up an API app.

On a core error, stop. Name the simple issue, then the next step. Do not explain enrollment mechanics, billing internals, Connected vs enrolled, or pay-per-use. Never retry 401 / 403-enrollment / credits-blocked / missing-tools unchanged. Never ask for keys. Never tell them to create an app, Project, or Production env except the quoted [error 2](#2-account-not-ready) steps.

**Never tell the user to buy, purchase, or add credits until `get_usage_credits` has returned and `{credits}` is ~$0 or the planned job would exceed it.** Do not use “you’ll need to purchase credits at https://console.x.com” (or any “buy credits first” variant) on connect or before that check. Missing tools is not a pay CTA.

## Connect order

Do this **before any user-facing X copy**:

1. Confirm X tools exist (tool list / server status).
2. If the plugin looks connected but tools are missing, that is [error 2](#2-account-not-ready) — stop. You cannot check credits without tools.
3. If not signed in / 401, that is [error 1](#1-sign-in-failed).
4. `get_users_me` (`user.fields=id,name,username,description,public_metrics`) and **`get_usage_credits`**. Cache `id` as `{me}` and `data.total_balance` as `{credits}`.
5. Then the [On connect](#on-connect) message.

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

- **`data.total_balance`** → `{credits}`. Use this for budgets and the ~$0 check. **Always tell the user how many credits they have** (`You have about $X.XX in credits.`), including $0.00. That is remaining balance, not the welcome gift.
- **`data.free_balance`** → leftover starter grant, if any. Do **not** say “you received $X”. Do **not** congrats just because this is `> 0` (returning sessions still have leftover free grants). Prepaid can be negative, so `free_balance > 0` and `{credits}` ~$0 can both be true — `{credits}` ~$0 wins.
- Ignore `free_grants` and `prepaid_balance` for user-facing copy. Do not choose what to spend.

Fetch it:

1. **On connect** — after tools exist, before any capabilities / congrats text.
2. **When a session starts and X calls are required** — alongside `get_users_me`.
3. **When the user asks what they can do** — ideas, a setup, a budget, remaining credits.

Do not fetch on every message.

### If they ask how much they received / starter credits

Do **not** dump `total_balance` or `free_grants` as the gift amount. Starter credits depend on their Cursor plan. **Only quote a row if you actually know their plan.** Do not guess. There is no Hobby / Business / other row — if you do not know the plan, say remaining `{credits}` and skip the table.

| Plan | Starter credits |
| ---- | --------------- |
| Cursor Ultra | $100 |
| SuperGrok Plus | $50 |
| Cursor Pro+ | $30 |
| Cursor Pro | $10 |

If they ask how much they have **left**, quote `{credits}` (`total_balance`) — same number you already state on connect.

## On connect

Once tools exist and `{credits}` is cached, send this once. Adapt the wording to your voice. Keep every capability bullet.

**`{credits}` ~$0 always wins:** skip congrats. Keep the bullets, say **You have $0.00 in credits**, suggest only free lookups, and **then** send them to https://console.x.com to add credits — skip “With that, we could.” Do **not** use the error-3 quote. Do not skip the $0.00 line.

**Congrats** only if `{credits}` is above $0 **and** they **just connected in this chat** (Connect completed this turn, first successful credits read right after signing in). Leftover `free_balance` on a later session is not a new gift — skip congrats.

If they just connected and `{credits}` is above $0, lead with:

> Congrats, you've received free X API credits to get started!

Then:

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
> With that, we could: (2–3 ideas from the matching [By budget](#by-budget) row, using `{credits}`).
>
> I'll show a cost estimate before anything expensive.

Always include the **You have about $X.XX** line (`total_balance`). Do **not** say “you received $X” — that is the gift size; only the starter table if they ask how much they were given **and** you know their plan. Do not mention purchasing or console.x.com unless `{credits}` is ~$0.

If they did **not** just connect this turn, skip the congrats line; keep capabilities, the remaining-balance line, and ideas.

Send it once per session. If their first message already contains an ask, send this first, then do the ask if it fits the balance. Later in the session, skip “Congrats, you've received…”.

## The three errors

Match `type`, `reason`, `title`, `detail`, or the missing-tools signatures below. Then say the quoted line. For **#1 and #2**, nothing else. For **#3**, the quoted line plus the free-only follow-up.

### 1. Sign-in failed

**When:** not signed in; connect prompt; 401; Unauthorized; login loop; token refresh failed. Plugin is **not** connected.

**Say:**

> You're not signed in to X. Reconnect the X plugin in this chat. Don't paste keys or passwords. Then I'll retry.

Trigger reconnect if you can. Probe once after. If it still 401s, stop.

If status is `connected` but tools=0, that is #2, not this.

### 2. Account not ready

**When (primary):** X is connected but the agent has **no tools** — the developer account is not set up or not enabled. Signatures:

- Server status: `X [connected]` with `tools=0`
- X namespace missing (`Use GetDynamicTools to discover available servers` and no X / `user-X` namespace)
- **Every** X tool missing (`user-X-get_users_me` not found **and** no other `user-X-*` tools)

Do **not** treat `get_usage_credits` not found as #2 by itself. If other `user-X-*` tools work, that is a missing endpoint or an outage — follow the 5xx / could-not-read-balance copy, not “create a Default Project and App.”

**When (fallback):** `client-forbidden`; `user-not-enrolled`; `client-not-enrolled`; Client Forbidden; 403 on timeline / mentions / search / bookmarks after Connect.

**Say:**

> X is connected, but this account isn't ready yet. Please remove and reinstall the X connection, then reconnect. If this doesn't work, please try the following:
>
> 1. Visiting https://console.x.com and creating a developer account
> 2. Ensure you have a Default Project created in the console
> 3. Ensure you have an App created in the console

Do not retry in a loop. Do not search. Do not send them to pay. Do not add extra enrollment speech beyond the quoted steps. Do not use “This X account isn't set up yet. Go to https://console.x.com, register and onboard…”.

### 3. Out of credits

**When:** a billed request is blocked until credits are added; “does not have any credits”; credits-blocked. **Not** a successful `get_usage_credits` with `total_balance` ~$0 — that uses the [On connect](#on-connect) $0 copy (or the ~$0 [By budget](#by-budget) row). **Not** missing tools (#2).

**Say:**

> You're out of credits. Go to https://console.x.com and add credits, then I'll retry.

Stop. Do not retry billed calls. Cache `{credits}` as $0. After the quoted line, you may offer **only free lookups** from the ~$0 [By budget](#by-budget) row: `{me}`, likers of a post, bookmark folders. Do not offer a cheaper paid search or timeline. After they add credits, re-fetch `{credits}` before retrying.

If the payload is only `usage-capped` (no enrollment reason):

> You hit a limit. Try again later.

If `user-not-enrolled` or `client-not-enrolled` is present, that is #2, not this.

## Edge cases

If the X connector is failing, stay on errors 1–3 or the 5xx outage line. Do **not** invent another way in.

### No browser / computer sign-in

**When:** you would open x.com (or console.x.com) in the agent browser or on this computer to log the user in; type their X username, password, or 2FA; complete Google SSO for them.

You cannot sign into the user's X account that way. Stop. Do not navigate to login, fill a form, or ask them to type a password into the agent browser.

**Say:**

> I can't sign into X from this browser or computer. Use the X plugin in this chat: tap Connect on the X card and sign in there. Don't paste keys or passwords.

Then follow [error 1](#1-sign-in-failed) or [error 2](#2-account-not-ready) if that is the real failure.

### No Bearer tokens / direct API

**When:** the connector is missing, 401s, or has no tools, and you would ask for a Bearer token, API key, app token, `X_BEARER_TOKEN`, or an Authorization header; or call `api.x.com` yourself with a pasted secret.

Do not ask. Do not accept one if they offer. This plugin is OAuth via the X connector only.

**Say:**

> Don't paste a Bearer token or API key. I only use the X plugin in this chat — tap Connect on the X card and sign in with X.

Then follow [error 1](#1-sign-in-failed) or [error 2](#2-account-not-ready). Do not curl, set headers, or stand up a local MCP with their token.

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

5xx / **503** / **`get_usage_credits` missing while other X tools work**: backoff once or twice. Do not treat it as $0 credits, a missing app, or [error 2](#2-account-not-ready). Other endpoints may still work. Then say:

> X's API looks like it's having an outage (this one isn't on you). Try again in a bit.

If it keeps failing, check [https://developer.x.com/status](https://developer.x.com/status). Do not start billed work without a credits read; wait for a successful `get_usage_credits` or for the user to say go.

200 + `errors[]`: use `data`, skip listed ids.

## Session start

When X calls are required this session: confirm tools exist, then `get_users_me` and `get_usage_credits`.


| Result                         | Next |
| ------------------------------ | ---- |
| Tools missing / not found      | [Error 2](#2-account-not-ready). Stop. |
| Success                        | Cache `{me}` and `{credits}`. If `{credits}` is ~$0, use the On connect $0 copy — not error 3. Otherwise do their ask if it fits. Prefer `{me}` for timeline, mentions, bookmarks. |
| Error 1                        | Quoted line only. Do not search. |
| Error 2                        | Quoted line only. Do not search. |
| Error 3                        | Follow [Out of credits](#3-out-of-credits). |
| 5xx / 503                      | Outage copy. Not $0, not error 2. Retry later. |
| 200 + `errors[]`               | Keep `data`. |


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

**Estimate larger than `{credits}`:** do not run it. If `{credits}` is ~$0, use the ~$0 [By budget](#by-budget) row (free lookups, then console.x.com). Do not use the error-3 quote unless a billed call was actually blocked. If they still have some balance, offer a cheaper alternative that **fits `{credits}`**, and send them to https://console.x.com only if they still want the larger job. After they top up, re-fetch `{credits}` before retrying.

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

Current user first. Confirm tools exist. Stop on error 1 or 2 with the quoted line only. On API error 3, quoted line plus free lookups only. A successful `{credits}` of ~$0 is **not** error 3. Tailor suggestions to `{credits}`.

### By budget

Pick from the **matching row**, not above it. Larger jobs still need an estimate and a yes. `$0.005`/post, `$0.01`/user, expansions bill too.


| `{credits}` | Suggest |
| ----------- | ------- |
| ~$0 | Say they have **$0.00 in credits**. `{me}` (free). Likers of a post (free). Bookmark folders (free). Then: add credits at https://console.x.com. |
| under ~$0.25 | One post from a link. One user by handle. Recent post counts on a topic. |
| ~$0.25–$1 | A small search (10–25 posts). One page of home or mentions. |
| ~$1–$5 | A few targeted searches. News on a topic plus trends for a location. Tidy bookmarks. |
| ~$5–$20 | Compare 2–3 accounts (profile + recent posts). A short research pass: counts, then a couple of search angles. |
| ~$20–$50 | Deeper research: several angles, a handful of accounts, news on the topic. One account’s recent posts across a few pages (confirm). |
| ~$50–$100 | A full-archive slice on one query. A competitive set of ~5–10 accounts. Paginated timelines (confirm). |
| ~$100–$500 | Large archive jobs. Many queries or many accounts. Broad topic monitoring across pages — always confirm. |
| ~$500–$1,000 | Org-scale historical pulls. Multi-query archive. Large comparative studies — confirm each large chunk. |
| $1,000+ | Very large archive / bulk historical. Long-running research. Never silent pagination; confirm every large chunk. |


When they ask what they can do, re-fetch `{credits}`, say how many they have left, then give 2–3 ideas from the matching row.

### Common tasks

- Home / mentions / my posts: `{me}`, modest `max_results`. Paginate only if asked.
- Handle: username → posts. Else user search, then ask.
- Topic: recent counts → small search page → stop.
- Bookmarks: list `{me}`. Save: parse status id, create bookmark.
- One post: parse status id, lookup.

## Don't

- Explain deep details (pay-per-use, Connected vs enrolled, billing internals, free vs prepaid grants). Do name the simple issue.
- Say pay-per-use or Production. Do not tell them to create an app or Project except the quoted [error 2](#2-account-not-ready) steps.
- Ask for secrets, Bearer tokens, API keys, or passwords. Do not sign the user into X in the agent browser or on this computer.
- Retry 403, missing-tools, or credits-blocked in a loop.
- Tell the user to buy / purchase / add credits before `get_usage_credits` has returned. Never use “you’ll need to purchase credits at https://console.x.com” unless the check showed ~$0 or a job would exceed `{credits}`.
- Quote `total_balance` or `free_grants` as “you received $X”. Congrats is the free-credits line only, and only when they **just connected this chat**. Gift size by plan is the starter table, and only if they ask **and** you know the plan. Always say remaining balance (`You have about $X.XX in credits.`, including $0.00). `{credits}` ~$0 skips congrats.
- Treat tools=0 / `user-X-*` not found as a paywall. That is [error 2](#2-account-not-ready).
- Pitch or run work above `{credits}`. If `{credits}` is ~$0, only free lookups. If they have some balance, offer a cheaper alternative that fits.
- Run an expensive request (over ~$0.25, pagination loops, bulk lookups) without giving an estimate and getting a yes.
