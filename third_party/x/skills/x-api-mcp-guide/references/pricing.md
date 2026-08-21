# X API pricing reference

Reference prices for cost estimates. May drift; the live endpoint https://console.x.com/api/credits/pricing wins. Billing docs: https://docs.x.com/x-api/getting-started/pricing. All prices USD, deducted from prepaid credits. $1.00 = 1,000 credits.

## How billing works

- **Reads** are billed **per object returned** (e.g. 100 posts returned = 100 × the post price). Expanded objects (`expansions`) count too.
- **Writes** are billed **per successful request**, at a flat rate per request type.
- Failed requests are not billed.
- **MCP tool calls** (`https://api.x.com/mcp`) proxy v2 endpoints 1:1 and cost exactly the same as the endpoint they wrap. There is no separate MCP price list.

## MCP tools → cost

| Tool | Wraps | Cost |
|---|---|---|
| `get_users_me` | `GET /2/users/me` | free |
| `get_users_by_id` / `get_users_by_username` / `get_users_by_usernames` / `search_users` | user lookup/search | $0.01/user |
| `get_posts_by_id` / `get_posts_by_ids` / `search_posts_all` / `get_posts_quoted_posts` | post lookup/search | $0.005/post |
| `get_users_posts` / `get_users_mentions` / `get_users_timeline` / `get_users_bookmarks` | user timelines | $0.005/post ($0.001 own data) |
| `get_posts_reposted_by` | `GET /2/tweets/:id/retweeted_by` | $0.01/user |
| `get_posts_liking_users` | `GET /2/tweets/:id/liking_users` | free |
| `get_posts_counts_recent` | `GET /2/tweets/counts/recent` | $0.005/call |
| `create_users_bookmark` / `delete_users_bookmark` | bookmark write | $0.005/call |
| `get_users_bookmark_folders` / `create_users_bookmark_folder` / `get_users_bookmarks_by_folder_id` | bookmark folders | free |
| `get_news` / `search_news` | news lookup/search | $0.005/story |
| `get_trends_by_woeid` | `GET /2/trends/by/woeid/:woeid` | $0.01/call |

## Read endpoints (billed per object returned)

`*` = **owned-data discount**: drops to **$0.001/object** when the authenticated user is reading their own data.

### Posts — $0.005/post
`GET /2/tweets` · `/2/tweets/:id` · `/2/tweets/:id/quote_tweets` · `/2/tweets/:id/retweets` · `/2/tweets/search/recent` · `/2/tweets/search/all` · `/2/lists/:id/tweets` · `/2/spaces/:id/tweets` · `/2/users/reposts_of_me` · `/2/users/:id/timelines/reverse_chronological` · `/2/users/:id/tweets`* · `/2/users/:id/mentions`* · `/2/users/:id/liked_tweets`* · `/2/users/:id/bookmarks`*

### Users — $0.01/user
`GET /2/users` · `/2/users/:id` · `/2/users/by` · `/2/users/by/username/:username` · `/2/users/search` · `/2/users/:id/affiliates` · `/2/users/:id/followers`* · `/2/users/:id/following`* · `/2/users/:id/blocking`* · `/2/users/:id/muting`* · `/2/lists/:id/followers` · `/2/lists/:id/members` · `/2/tweets/:id/retweeted_by` · `/2/spaces/:id/buyers`

### Direct Messages — $0.01/event
`GET /2/dm_events` · `/2/dm_events/:event_id` · `/2/dm_conversations/:id/dm_events` · `/2/dm_conversations/with/:participant_id/dm_events` · `/2/chat/conversations` · `/2/chat/conversations/:id` · `/2/chat/conversations/:id/events`

### Lists — $0.005/list
`GET /2/lists/:id` · `/2/users/:id/followed_lists`* · `/2/users/:id/list_memberships`* · `/2/users/:id/owned_lists`* · `/2/users/:id/pinned_lists`*

### Spaces — $0.005/space
`GET /2/spaces` · `/2/spaces/:id` · `/2/spaces/by/creator_ids` · `/2/spaces/search`

### Communities — $0.005/community
`GET /2/communities/:id` · `/2/communities/search`

### News — $0.005/story
`GET /2/news/:id` · `/2/news/search`

## Write and per-request endpoints (flat rate per successful call)

### Posting
| Endpoint | Price |
|---|---|
| `POST /2/tweets` — standard post | $0.015 |
| `POST /2/tweets` — post whose text contains a URL | $0.20 |
| `POST /2/tweets` — reply/quote where the author was mentioned ("summoned") | $0.01 |
| `DELETE /2/tweets/:id` | $0.005 |
| `PUT /2/tweets/:tweet_id/hidden` (hide/unhide reply) | $0.01 |

### Engagement
| Endpoint | Price |
|---|---|
| `POST /2/users/:id/likes` | $0.015 |
| `DELETE /2/users/:id/likes/:tweet_id` | $0.01 |
| `POST /2/users/:id/retweets` | $0.015 |
| `DELETE /2/users/:id/retweets/:source_tweet_id` | $0.005 |
| `POST /2/users/:id/bookmarks` | $0.005 |
| `DELETE /2/users/:id/bookmarks/:tweet_id` | $0.005 |

### Social graph & privacy
| Endpoint | Price |
|---|---|
| `POST /2/users/:id/following` | $0.015 |
| `DELETE /2/users/:source_user_id/following/:target_user_id` | $0.01 |
| `POST /2/users/:id/muting` | $0.01 |
| `DELETE /2/users/:source_user_id/muting/:target_user_id` | $0.005 |
| `POST /2/users/:id/dm/block` and `/dm/unblock` | $0.01 |
| `DELETE /2/dm_events/:event_id` | $0.01 |

### Lists
| Endpoint | Price |
|---|---|
| `POST /2/lists` · `POST /2/lists/:id/members` · `POST /2/users/:id/followed_lists` · `POST /2/users/:id/pinned_lists` | $0.01 |
| `DELETE /2/lists/:id` · `DELETE /2/lists/:id/members/:user_id` · `DELETE /2/users/:id/followed_lists/:list_id` · `DELETE /2/users/:id/pinned_lists/:list_id` | $0.005 |

### Articles & media
| Endpoint | Price |
|---|---|
| `POST /2/articles/draft` · `POST /2/articles/:article_id/publish` | $0.01 |
| `POST /2/media/upload/:id/finalize` | $0.01 |
| `POST /2/media/metadata` · `POST /2/media/subtitles` · `DELETE /2/media/subtitles` | $0.005 |

### Counts & trends
| Endpoint | Price |
|---|---|
| `GET /2/tweets/counts/recent` | $0.005 |
| `GET /2/tweets/counts/all` | $0.01 |
| `GET /2/trends/by/woeid/:woeid` | $0.01 |
| `GET /2/users/personalized_trends` | $0.01 |

## Streaming & webhook deliveries (billed per event delivered)

| Event delivered | Price |
|---|---|
| Post | $0.005 |
| User / Follow | $0.01 |
| Direct Message | $0.01 |
| Profile update | $0.005 |
| Like | $0.001 |
| Mute / Block | $0.001 |

## Free endpoints (no per-use charge)

- `GET /2/users/me`
- `GET /2/tweets/:id/liking_users`
- `GET /2/media` · `GET /2/media/:media_key`
- Bookmark folders: `GET /2/users/:id/bookmarks/folders` (and by folder id) · folder create
- Stream connection & management: stream rules, webhook & Account Activity configuration, replay
- Compliance jobs, connections, usage endpoints
- Chat/DM sends, communities create, notes

## Cost-saving tips

- Batch lookups (`GET /2/tweets?ids=...`, `GET /2/users?ids=...`) cost the same per object as single lookups — but fewer requests means fewer rate-limit hits.
- You pay **per object returned**: set `max_results` to what you actually need.
- Expansions are billed as returned objects — only request `expansions` you will use.
- Reading your own data (your posts, mentions, likes, bookmarks, followers, lists) is 5–10× cheaper than reading other users' data.
- Avoid putting URLs in post text unless necessary: a post with a URL costs $0.20 vs $0.015 without.
