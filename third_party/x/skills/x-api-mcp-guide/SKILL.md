---
name: X MCP guide
description: >-
  ALWAYS read this when a user connects the X plugin or any X MCP, before using
  any X connection, and again on any X error. Do not call an X tool until this
  file has been read in the current turn. On first connect, send the user the
  capabilities message defined here. Estimate the cost of every X call before
  making it and confirm with the user before anything expensive.
---
# X MCP guide

This plugin uses **X MCP**. The user taps Connect and signs in with X. They are not setting up an API app.

Probe the current user before search, timeline, bookmarks, or news. On a core error, stop. Name the simple issue, then the next step. Do not explain enrollment mechanics, billing internals, Connected vs enrolled, or pay-per-use. Never retry 401 / 403-enrollment / credits-blocked unchanged. Never ask for keys. Never tell them to create an app, Project, or Production env.

## On connect

The first time the user connects X — or on their first X interaction in a session — send this capabilities message once. Adapt the wording to your voice, keep every line of content:

> You're connected to X. Here's what I can do:
>
> - **Your account** — your profile, home timeline, your posts, and mentions
> - **Posts** — open any post from a link, and see who liked, reposted, or quoted it
> - **Users** — look up any account by handle, search for users, and read their posts
> - **Search** — search posts across X and count post volume on a topic
> - **News & trends** — search X news stories and get trends by location
> - **Bookmarks** — list, add, and remove bookmarks, and organize them into folders
>
> Requests use credits: you'll need to purchase credits at https://console.x.com for this to work. I'll show you a cost estimate before anything expensive.

Send it once per session, not on every message. If their first message already contains an ask, send this first, then do the ask.

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

Stop. Do not retry.

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

Resolve the current user (`user.fields=id,name,username,description,public_metrics`).


| Result           | Next                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| Success          | Cache `id` as `{me}`. Do their ask. Prefer `{me}` for timeline, mentions, bookmarks. |
| Error 1, 2, or 3 | Stop. Say that error's line. Do not search.                                          |
| 200 + `errors[]` | Keep `data`.                                                                         |




## Cost awareness

Every X call can charge the user. Estimate the cost **before** calling. Read [references/pricing.md](references/pricing.md) — it has the tool-by-tool price table, per-endpoint prices, free endpoints, and cost-saving tips. Once per session, fetch live pricing from https://console.x.com/api/credits/pricing (plain GET, no auth); it wins over the reference file.

The live payload:

- `eventTypePricing` — price **per resource returned** (each post, user, news story…).
- `requestTypePricing` — price **per request** (writes, counts, trends…).
- All prices are **USD dollars**: `0.005` = $0.005 = half a cent. Fractional cents to 3 decimal places are normal. $1.00 = 1,000 credits — that conversion is for your own math; quote costs to the user in dollars only.

Estimate = (resources requested × per-resource price) + per-request price. `max_results` bounds a read: a search with `max_results=100` returning posts + expanded authors can cost ~100 × $0.005 + 100 × $0.01. Each pagination page bills again. Only request expansions you'll use — expanded objects bill too.

**Under ~$0.25:** just do it — don't nag about pennies. Keep `max_results` small (10–25) unless they asked for more.

**Over ~$0.25, or any pagination loop / bulk job:** stop first. Give a one-line estimate and ask:

> This will cost about $X.XX. Want me to continue?

Wait for a yes. Never silently run multi-page loops, full-archive searches, or bulk lookups. If they say yes, track spend as you go; if the running total will pass roughly double the estimate, stop and re-confirm.

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

Current user first. Stop on errors 1–3.

- Home / mentions / my posts: `{me}`, modest `max_results`. Paginate only if asked.
- Handle: username → posts. Else user search, then ask.
- Topic: recent counts → small search page → stop.
- Bookmarks: list `{me}`. Save: parse status id, create bookmark.
- One post: parse status id, lookup.



## Don't

- Explain deep details (pay-per-use, Connected vs enrolled, billing internals). Do name the simple issue.
- Say pay-per-use, Project, Production, or "create an app".
- Ask for secrets.
- Retry 403 or credits-blocked in a loop.
- Run an expensive request (over ~$0.25, pagination loops, bulk lookups) without giving an estimate and getting a yes.

