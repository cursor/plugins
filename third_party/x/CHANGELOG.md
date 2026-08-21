# Changelog

All notable changes to this plugin will be documented here.

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
