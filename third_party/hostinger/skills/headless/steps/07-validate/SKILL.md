---
name: headless-step-validate
description: "Step 7 (validate) of the Hostinger Headless flow. OPTIONAL quick gate before deploy: every prior stage already self-verifies, so this is a fast confirmation (instance live + backend API answers with seeded content) plus optional local preview and user sign-off. Skip the heavy parts when nobody needs to approve."
---

# headless-step-validate

> **Optional / fast.** Every stage before this one already verifies its own work (provision checks the
> backend, content-model push checks the REST counts, frontend builds clean), and **deploy verifies the
> live result**. So validate is **not** a re-run of all that — it's a quick confirmation, plus the
> optional human preview/sign-off. **Skip Steps 3–4 (rebuild + approval) entirely** on an autonomous or
> temp-domain run where no one is signing off; just do the two 10-second checks below and move on. Spend
> time here only when a person wants to see it before it goes live.

**In:** project in `~/.hostinger/<domain>/src/`, `site.json`, `state.json`.

## 1 — Instance status (always, quick)

`provision.status == "completed"` **and** re-verify against the connector:
`hosting_websites_list-setups { "domain": "<domain>" }`, exact-match the row → `completed`. Anything
else → not ready; return to the instance barrier, don't deploy.

## 2 — Backend API status (WordPress / WooCommerce / Ecommerce, always, quick)

Hit the live API from `site.json` and confirm it answers **with the content the push created** — a 200
with an empty catalog means the push didn't land:

- **WordPress:** `GET {urls.rest_api}/posts?per_page=1` → 200 JSON array; check `X-WP-Total` against the
  planned post count, and `GET {urls.rest_api}/media?per_page=1` → `X-WP-Total` matches the planned
  image count (more = duplicates).
- **WordPress + WooCommerce** (`site.json → woocommerce.enabled`): the WordPress check above **plus**
  `GET {urls.store_api}/products?per_page=100` → 200 with the seeded products and `prices` (minor units);
  count matches the plan. Don't test checkout while `woocommerce.payment_enabled` is `false`.
- **Ecommerce:** query `urls.storefront_api` for the sales channel → 200 with the seeded products and
  prices *(confirm against the store)*.
- **Contact form** (`site.json → contact_form.enabled`): POST one throwaway test submission (dummy
  name/email/subject/message + CF7's hidden `_wpcf7*` fields — see
  `../04-content-model/wordpress/contact-form.md` §3) to `contact_form.feedback_url` and assert the JSON
  `status` is **`mail_sent`**. This is the one place a real send happens, so one test email reaches the
  owner — not several. `mail_failed` is a real finding: surface it to the user (CF7 is wired, but
  `wp_mail` delivery/SPF needs attention — a Hostinger mailbox on the domain is the most reliable
  recipient) and log it as an issue. A `validation_failed` means the test payload didn't match the form's
  fields — fix the field names in `site.json`, not the plugin.
  **Then check the honeypot:** POST a **second** throwaway submission with the same valid fields **plus**
  `contact_form.honeypot_field` **filled**, and assert the `status` is **`spam`** (no mail sent). Keep the
  real fields valid — CF7 validates **before** running the spam filter, so an invalid payload would return
  `validation_failed` and never reach the honeypot check. A `mail_sent` here means the
  `cf7-headless-spamguard` plugin isn't active — surface it and re-check its deploy.

Fail or counts off → fix content-model push before building against live data.

## 3 — Clean rebuild against the live API (optional — skip unless signing off)

Frontend already produced a clean build; only redo this if you want a from-scratch guarantee before a
human sign-off. Remove the build output and rebuild; a failed or incomplete build is a stop (no
fixtures, placeholder copy or `.htaccess` in the output).

- **Astro (SSG):** `rm -rf dist && npm run build && npm run check:dist`.
- **Next.js (SSR):** `rm -rf .next && npm run check && npm run build`.

## 4 — Preview & approval (optional — only when a person is signing off)

When someone wants to see it first: start the local preview (Astro: `npm run preview`; Next.js:
`npx next start`), check desktop and mobile widths, navigation and a couple of key routes, and present
it for **explicit approval**. If preview tooling is unavailable, give the user the command and URL.
On an autonomous or temp-domain run, skip this — deploy will verify the live result anyway.

Then (after approval, or immediately if 3–4 were skipped): `state.json` → `stage: "deploy"`, fresh
`updated_at`; leave `provision` unchanged.
