---
name: headless-step-provision-ecommerce
description: "Provision a Hostinger Ecommerce backend for the Hostinger Headless flow: ensure the hostinger-ecommerce MCP is connected, create the headless website (frontend host) and a Hostinger Ecommerce STORE with a custom (headless) sales channel, set shipping + payment, and record it all in site.json."
---

# headless-step-provision-ecommerce

Provision a **Hostinger Ecommerce** backend for `<domain>` and prove it is ready. Two distinct things:

1. A **headless website** (`type: "headless_ecommerce"`) — this is only the **hosting slot for the
   storefront you'll build**. It installs **no store engine** (no `/cms`, no API on the domain).
2. A **Hostinger Ecommerce store** — a separate object created through the **Ecommerce API**, with a
   **custom (headless) sales channel**. The storefront reads this store's **public Storefront Core V2
   API**, keyed on the sales channel. This is the real backend.

**Out:** `site.json` (store id, custom sales channel id, URLs).

> ## ⚠️ Prerequisite: the `hostinger-ecommerce` MCP server must be connected
> Store management is **not** in the `hosting`/`wordpress` MCP groups — it's the separate
> **`hostinger-ecommerce`** group (`ecommerce_*` ops, OAuth-backed, no API token needed). If those
> tools aren't available, add the server and **reconnect the session** before continuing:
> ```bash
> claude mcp add-json hostinger-ecommerce '{"command":"npx","args":["--package=@hostinger/mcp@latest","hostinger-ecommerce-mcp"],"env":{"USER_AGENT":"extension;claude-code;via-cursor;1.4.2"}}' --scope user
> ```
> (For other tools, enable the **Ecommerce** MCP in the Hostinger Connector.) A newly added MCP server
> only loads on a session restart/reconnect.
>
> **Can't restart your own session? Don't block — drive the server directly.** A coding agent usually
> can't reconnect itself, so instead of stopping, run the stdio server yourself and speak MCP to it:
> spawn `npx --package=@hostinger/mcp@latest hostinger-ecommerce-mcp` (same `USER_AGENT` as above) and
> send newline-delimited JSON-RPC over its stdin/stdout — `initialize` → the `notifications/initialized`
> notification → `tools/list` → `tools/call`, where the tools are `search` / `execute` / `multi-execute`
> (call ops exactly as in-session: `{ "name": "execute", "arguments": { "operation": "…", "params": {…} } }`).
> It self-authenticates with the same stored Hostinger OAuth creds as the other connected servers, so
> there is **no token to handle** (keep any secret off the command line). Your sandbox may ask the user
> to approve spawning it — ask once, then proceed. Only fall back to asking the user to restart if
> driving the server directly isn't permitted.
>
> Verify the tools work (in-session or via the direct drive) with a search — e.g. "list stores" →
> `ecommerce_stores_list` — before proceeding.
> The authoritative, always-current build guide is `ecommerce_miscellaneous_custom-storefront-setup-instructions` — read it once per build.

All website-lifecycle calls go through the `hosting` connector (`execute`); all store calls through the
`hostinger-ecommerce` MCP.

## Step 1 — The headless website (frontend host)

Same lifecycle as `../wordpress/SKILL.md` Steps 1–2, but `type: "headless_ecommerce"`:

1. Detect: `hosting_websites_list` / `hosting_websites_list-setups` (exact-match the domain). `completed`
   → adopt. `running` → poll. `failed` → stop, point at hPanel. If `website_type` is not `headless`
   (plain WordPress, Node.js, …), stop and tell the user — don't overwrite another kind of site.
2. Create (only if **no** site exists): `hosting_websites_start-setup { order_id, type: "headless_ecommerce", domain }`
   — **omit `domain`** for a temporary subdomain: the setup generates one itself and returns it (don't
   call a separate subdomain op first — there's no need in this flow; the API would also accept one you
   generated via `hosting_domains_generate-free-subdomain`, valid 24 h from the client that made it). The
   response carries the generated domain; if it differs from the workspace dir, move
   `~/.hostinger/<old>/` → `<new>/` (if `<new>/` already exists, stop and ask instead of moving
   into it) and update `brief.md`. Poll `list-setups` to `completed`. `website_type` will be `headless`.

> **Onboarding handoff — an empty headless shell needs no new website.** If the domain already has an
> empty headless shell (`website_type: headless`, setup `type: headless_empty`, nothing installed —
> typically created in onboarding), **adopt it as the storefront host and skip the create.** A
> `headless_ecommerce` website installs no store engine either, so an empty headless shell *is* the host
> you need — there is no backend to "swap" on the website side. Record its `username`/`order_id` and go
> straight to Step 2 (store + custom sales channel). Never call `start-setup` on a domain that already
> has a site.

> Don't expect `/cms` or any API on this domain — it serves the storefront you build (Step 6) and
> deploy (Step 8).

## Step 2 — Resolve or create the store + custom sales channel

`ecommerce_stores_list` → reuse an existing store if this build already made one; otherwise create:

```json
{ "operation": "ecommerce_stores_create",
  "params": { "name": "<store name>", "country_code": "US", "company_email": "<email>",
    "company_name": "<store name>", "language": "en",
    "sales_channel": { "type": "custom", "external_id": "<slug>-headless" } } }
```

This returns `store.id` (`store_*`) **and** a custom `sales_channel.id` (`scha_*`) in one call — the
custom channel is what the headless storefront is keyed on. (You can also add one later with
`ecommerce_sales-channels_create { store_id, type:"custom", name }`.) Currency comes from
`country_code` (`default_currency_code`); all prices are **minor units** (cents).

## Step 3 — Store readiness: shipping + payment

A store needs ≥1 shipping zone and ≥1 payment method to check out.

- **Shipping:** `ecommerce_shipping_set-store { store_id, price }` (minor units; 0 = free).
- **Payment:** `ecommerce_payments_enable-manual-method { store_id, title }`.

> **Known gate — free accounts have no payment method, and therefore no checkout.** On a **free
> account** (and any account/store without a paid Hostinger Ecommerce plan), `enable-manual-method`
> returns **HTTP 402**, and checkout later fails with `400 payment_provider_not_configured`. This is
> **expected, not an error** — payment, and therefore checkout, is simply unavailable on the plan. The
> catalog and the storefront still work fully. **Never block, stop, loop or retry the build on this:**
> - Record `payment_enabled: false` in `site.json` (set `shipping_enabled` as usual).
> - Tell the user in one line that checkout needs a paid Ecommerce plan, and carry straight on.
> - Treat the 402 as a normal outcome — don't surface it as a failure or re-attempt the call.
> - Never ask the user for payment credentials.
>
> Every downstream stage reads `site.json → ecommerce.payment_enabled` and, when it is `false`, skips
> all checkout wiring and verification (see content-model Step 5, frontend, deploy). A store with
> `payment_enabled: false` is a **complete, valid build** — a browsable catalog without checkout.

## Step 4 — Verify

- `ecommerce_stores_metadata { store_id }` → `has_shipping` true; `has_payment_methods` (may be false,
  see the gate); read `default_currency` (`decimal_digits`, `template`) here, don't guess.
- Public Storefront V2 answers for the channel (no auth):
  `GET https://api-ecommerce.hostinger.com/v2/channels/<scha_*>/products?limit=100` → 200 (empty until
  content-model seeds products — fine here).
- `GET https://<domain>/` returns the Hostinger default page until the storefront is deployed — expected.

## Step 5 — Record `site.json`

```json
{
  "backend": "ecommerce",
  "website_type": "headless",
  "order_id": 1007223428,
  "username": "u…",
  "ecommerce": {
    "store_id": "store_…",
    "sales_channel": { "id": "scha_…", "type": "custom", "external_id": "…-headless" },
    "currency": "usd",
    "payment_enabled": false,
    "shipping_enabled": true
  },
  "urls": {
    "site": "https://<domain>",
    "storefront_api": "https://api-ecommerce.hostinger.com/v2/channels/<scha_*>",
    "store_admin": "https://ecommerce.hostinger.com/store/<store_*>"
  },
  "provisioned_at": "…",
  "verified_at": "…"
}
```

No secrets in `site.json`. After deploy, link the channel to the live domain with
`ecommerce_sales-channels_update { store_id, sales_channel_id, url }` (done in the deploy stage).
