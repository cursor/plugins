# Changelog

All notable changes to this plugin will be documented here.

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
