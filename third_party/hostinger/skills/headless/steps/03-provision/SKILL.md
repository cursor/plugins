---
name: headless-step-provision
description: "Step 3 (provision) of the Hostinger Headless flow. Chooses the backend from brief.md (wordpress | ecommerce | webapp), then routes to the matching subfolder to provision it; writes site.json. WordPress + WooCommerce routes to the wordpress subfolder with the WooCommerce store turned on — it is not a separate backend."
---

# headless-step-provision

Router. The backend is decided in **refine** and recorded in `brief.md`; this step only routes to the
matching subfolder, which provisions it.

**In:** `brief.md`. **Out:** `site.json` (written by the subfolder).

**This stage runs in the background.** Provisioning is mostly a poll wait, so it splits in two: a
**fire** half (detect + create, returns straight away) and a **join** half (poll to `completed`,
verify, write `site.json`). Fire it, record `provision.in_progress`, then go do the prepare work of
the other stages (content-model prepare, frontend shell) while it settles. Only cross back to
the join half when an instance-barrier step needs the live backend. See *Background provision & the
instance barrier* in the top-level `SKILL.md`. An agent that can't interleave simply does fire and
join back-to-back — still correct, just no overlap.

## Step 1 — Route on the suggested backend

Read the brief's **Suggested backend** section:

| Suggested backend | Follow |
|---|---|
| WordPress | `wordpress/SKILL.md` |
| WordPress + WooCommerce | `wordpress/SKILL.md` **with the WooCommerce store on** (see below) |
| Ecommerce | `ecommerce/SKILL.md` |
| Webapp | `webapp/SKILL.md` |

If the section is missing or names something else, go back to **refine** — don't pick one here.
Tell the user the backend and its one-line reason before provisioning.

> **WordPress + WooCommerce is the WordPress backend with a store — not a new backend.** Route it to
> `wordpress/SKILL.md` and follow that recipe's **optional WooCommerce tail** (install + activate the
> `woocommerce` plugin and verify the store endpoints; the catalog is seeded later through the per-site WP
> MCP's native `wc-*` abilities — no custom plugin, no consumer key). `site.json → backend` stays
> `"wordpress"`; the store is recorded under `site.json → woocommerce` (`enabled: true`). Everything else
> downstream that routes on
> `wordpress` (content-model push, deploy's `/cms` preservation, done's wp-admin login) then works
> unchanged.

> **Supported backends: `wordpress` (optionally with a WooCommerce store), `ecommerce` and `webapp`.**
> `webapp` is a plain Node.js app host (an empty website — no CMS, no store, no `/cms`) for any app/SPA
> that brings its own code and data; it never installs WordPress. PocketBase is not available in this
> version — refine never proposes it, and there is no `pocketbase/` subfolder; if a brief somehow names
> it, stop and tell the user rather than improvising it. A **WordPress + Ecommerce** brief (two separate
> backends — a WordPress site **and** a Hostinger Ecommerce store) has no single combined `start-setup`
> type yet: stop, tell the user it isn't supported as one site, and offer either to continue with just
> WordPress or just Ecommerce (route to that one subfolder), **or**, if they want content and a store on
> **one** site, to switch the brief to **WordPress + WooCommerce** — the one-site path, which routes to
> `wordpress/SKILL.md` with the store on.

## Onboarding handoff — swap an existing empty headless shell (do this before creating anything)

Onboarding can create the website **before** you ever run, then paste the build prompt into this agent.
When it does, the domain already has an **empty headless shell**: a website set up with
`hosting_websites_start-setup { type: "headless_empty" }` — `website_type` is `headless`, but **nothing
is installed** (no WordPress at `/cms`, no store). It is the hosting slot only, waiting for a backend.

So provision has **two entry shapes**, and each subfolder's *detect* step picks between them:

- **An empty headless shell already exists for the domain → adopt it and *swap* it to the chosen
  backend. Never call `start-setup` again, never create a second site.** The swap is backend-specific:
  - **WordPress** → install WordPress **into the existing shell's `/cms`** with
    `wordpress_installations_install { type: "headless" }` (it rewrites the root `.htaccess` and marks
    the site headless-WordPress). Do **not** use `start-setup { type: "headless_wordpress" }` — that is
    only for creating a fresh site.
  - **Ecommerce** → the empty headless shell **is** the storefront host already (a `headless_ecommerce`
    website installs no store engine either). Adopt it as the frontend host and go straight to creating
    the store + custom sales channel.
- **No site exists for the domain at all → create it fresh, exactly as each subfolder defines today**
  (`start-setup` with the backend's own `type`).

> **Webapp is not part of this handoff at all.** `webapp` is **not** reached on the usual onboarding
> flow — it is only triggered by experimental actions — so it **ignores headless instances entirely**:
> it never detects, adopts or swaps an empty headless shell, and provisions its own **Node.js app host**
> exactly as `webapp/SKILL.md` defines today. The swap below is **WordPress and Ecommerce only**.

**How to tell an empty shell from an already-provisioned backend** (both read `website_type: headless`):

1. Exact-match the domain row in `hosting_websites_list` — if there is **no** row, nothing exists → create fresh.
2. Within 24 h of onboarding, `hosting_websites_list-setups` still shows the setup `type`
   (`headless_empty` = empty shell; `headless_wordpress` = WordPress already; `headless_ecommerce` = an
   ecommerce host). Beyond 24 h the setup drops off — fall back to the backend probe:
3. `wordpress_installations_list { username, domain, ownership: "all" }` — a row with `directory: "cms"`
   and `is_valid: true` means WordPress is **already** installed (adopt, don't swap); **no** such row on
   a `headless` site means the shell is still empty and WordPress must be swapped in. A local `site.json`
   with a recorded backend means a previous run already provisioned — trust reality over it, but it tells
   you not to expect an empty shell.

This only changes *detect*. Everything after the swap (verify, `site.json`, the WooCommerce tail, the
background fire/join split) is identical to a fresh provision. A swap that installs WordPress is still
asynchronous — fire it, record `provision.in_progress`, and join at the barrier just like a fresh create.

## Step 2 — Fire (don't block)

Follow the chosen subfolder's `SKILL.md` through **detect + create** (its "start-setup" call). The
moment the create is accepted and queued, record it in `state.json` and **return** — do not sit on the
readiness poll:

```json
{ "stage": "content_model",
  "provision": { "status": "in_progress", "domain": "<domain>", "started_at": "<now>" } }
```

Now go run the prepare work that doesn't need the backend (content-model prepare, frontend
shell). The subfolder's readiness poll, verification and `site.json` are the **join** half below.

## Step 3 — Join (at the instance barrier)

When an instance-barrier step is about to run (content-model push, frontend data wiring, deploy) — or
right away, if the agent can't interleave — finish the subfolder's `SKILL.md`: **poll to `completed`**,
run its verification, and write `site.json` (which records the chosen `backend`). Then set
`provision.status` to `"completed"` in `state.json` with a fresh `updated_at`. On resume, treat a
stored `in_progress` as a hint only — re-poll `hosting_websites_list-setups` for the truth first.
