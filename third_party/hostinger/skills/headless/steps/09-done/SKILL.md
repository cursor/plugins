---
name: headless-step-done
description: "Step 9 (done) of the Hostinger Headless flow. Verifies the live site, then hands over the URLs (hPanel success page, main site, WordPress/store admin, dashboard), opens the success page in the browser on a successful run, and gives a summary of what was built and what the user can do next. Its final report format is also used whenever a run stops early."
---

# headless-step-done

Verify the live site, then hand over the URLs (success page, main site, WordPress admin, dashboard), a
summary of what was built, and what the user can do next. **On a successful run, open the success page
for the user** (see *Open the success page*).

## Verify the live site (brief)

On a run that deployed this session, re-confirm what you're about to hand over actually works (deploy
already checked this — this is a quick re-confirm, not a full re-run):

- **Main site:** `GET https://<domain>/` → 200 (Next.js SSR: `x-powered-by: Next.js`; Astro SSG: static
  HTML with real content).
- **WordPress admin:** `GET {urls.wp_admin}` → reachable (a login page, 200/302), not 404.
- **Backend API:** `GET {urls.rest_api}/posts?per_page=1` → 200 (WordPress); for a **WooCommerce** store
  (`site.json → woocommerce.enabled`) also `GET {urls.store_api}/products?per_page=1` → 200; or the
  storefront API for the sales channel → 200 (Ecommerce).
- **Contact form** (`site.json → contact_form.enabled`): validate already sent a test submission, so
  don't send another here. In the handover, tell the owner the contact page is live and enquiries email
  the **WordPress admin address** (via `wp_mail`) — and that for the most reliable delivery that address
  should be a Hostinger mailbox on the domain. If validate reported `mail_failed`, say so plainly instead
  of claiming the form sends.

If a check fails, say so in the outcome paragraph and don't claim the site is live.

## Final report

Every run ends with this report, whether it finishes here or stops at an earlier stage (a dummy or
missing step, a failed provision, the user pausing). Build it from `state.json`, `site.json`,
`deploy.json` and what you actually did and checked in this run. Report only what you verified. Don't
claim a stage passed if you didn't check it.

Write it in this order:

1. **One-paragraph outcome.** What was created and on which domain (bold it). If the run stopped
   early, name the stage it stopped at, why, and what the user will see right now (e.g. "the site
   root returns 403 until the frontend is deployed").

2. **Steps completed** — a table with one row per stage that ran:

   | Stage | Result |
   |---|---|
   | connect | How the connector was reached, MCP version, how sign-in happened. |
   | 1 check state | New build / resumed at `<stage>` / adopted an existing site. |
   | 2 refine | What the brief is and which backend it chose (say if a sample brief was used). |
   | 3 provision | Plan and order used, how long setup took, which verification checks passed. |
   | 4 content model | What was created (counts of pages, posts, terms, menus, media, SEO) and how it was verified. |
   | … | One row for each further stage that ran (design, frontend, validate, deploy, done). |

   Stages that didn't run are left out of the table and named in the outcome paragraph instead.
   Use the stage numbers and names from the orchestrator's flow table.

3. **Links** — every URL that exists at this point. Build the hPanel URLs from `site.json`
   (`order_id`, `username`, `domain`) and the onboarding slug; take the rest from `site.json` /
   `deploy.json`. Lead with the one the user cares about most — the **main site** — then the admin
   and dashboards. **Don't list the success page here:** it opens on its own (see *Open the success
   page*), so printing its URL in the report is just noise — the only exception is when a browser
   can't be opened (handled in that section):

   - **Main site (live):** `urls.site` (`https://<domain>`) — only once deployed.
   - **WordPress admin (one-click auto-login):** for a WordPress backend, **mint and hand over the
     auto-login redirect URL** — `wordpress_login_create-links { username, software: <site.json
     wordpress.install_id> }` returns a temporary link that logs the user straight into wp-admin. Give
     that URL as the admin link (it lands on `/cms/wp-admin`), so the user never needs a password. Also
     note the plain `urls.wp_admin` as a fallback. **Never print or store a password.** For a
     **WordPress + WooCommerce** store, this *same* wp-admin login is the store admin (wp-admin →
     WooCommerce → Products/Orders) — do **not** use the Ecommerce `store_admin` path. **Call out the one
     setup step under *Gaps / follow-ups*:** when `site.json → woocommerce.payment_enabled` is `false`,
     the owner must enable a payment method + a shipping zone in WooCommerce → Settings before checkout
     works (the catalog and cart already work). For a Hostinger **Ecommerce** store, link the store admin
     from `urls.store_admin` instead.
   - **hPanel site dashboard:** `https://hpanel.hostinger.com/websites/<domain>` (the headless website
     is installed by now).
   - **Onboarding (resume):** `https://hpanel.hostinger.com/headless-onboarding/<order_id>/<username>/`
   - **REST API** (for developers): `urls.rest_api`.

   > URL shape note: `<username>` may be dropped from the onboarding/success URLs in a future hPanel
   > release. If a built URL 404s, retry the same path without the `/<username>` segment before
   > reporting it as broken.

4. **Where state lives** — the workspace path `~/.hostinger/<domain>/`, the `stage` that a
   resumed run will start from, and the build report `~/.hostinger/<domain>/report.html`.

5. **Gaps / follow-ups** (only if any) — a short numbered list of anything skipped, approximated or
   left for the user (e.g. no images generated, default WordPress content left in place).

Never include passwords, JWTs or other secrets in the report. For wp-admin access, give the URL and
offer a one-click login link (`wordpress_login_create-links`), not credentials.

## Open the success page

On a **successful** run (the deploy succeeded and the live checks passed), open the success page in the
user's **main / system browser** right after presenting the report, so they land on the hPanel
celebration/next-steps screen for their new site. This is a side effect only — **don't print the
success URL in the report output** (it just opens); the one exception is the can't-open-a-browser
fallback below. Build the URL with `<tool>` as the running tool's onboarding slug (see *State and
artifacts* in the top-level `SKILL.md`):

```bash
# Build the URL first, then open it with the OS default (main) browser — not an embedded one.
# <tool> = the onboarding slug
URL="https://hpanel.hostinger.com/headless-onboarding/<order_id>/<username>/success/<domain>/<tool>"
open "$URL"        # macOS
# xdg-open "$URL"  # Linux
# start "" "$URL"  # Windows
```

- **Main browser only.** Use the OS opener above (`open` / `xdg-open` / `start`) so the page lands in
  Chrome, Safari, Edge, or whatever the user actually uses. **Do not** open it in an embedded or
  sandboxed browser (Cursor IDE browser / `cursor-ide-browser`, Playwright, Puppeteer, WebView, or
  any in-agent browser tab). Those stay inside the tool session and the user won't see the
  celebration page where they expect it.
- Open it **once**, and only on a successful run — never on an early stop or a failed deploy.
- If your tool can't open a browser (the command isn't available, or `open`/`xdg-open`/`start`
  fails), don't treat it as a failure and **don't fall back to an embedded browser**. This is the
  **one** case where you print the success URL — show it once in the report and tell the user to
  open it themselves in their main browser.

## Build report

Right after the final report, save the build report for this run. It turns the run log (stage times
from `state.json`, events from `events.jsonl`) into `reports/<run>.json` and `.html`, and copies the
HTML to `report.html` in the workspace:

```bash
node <skill>/run-log.mjs <domain> event good '{"text":"<something that went well>"}'   # one per thing, if not logged yet
node <skill>/run-log.mjs <domain> stage-end done ok
node <skill>/run-log.mjs <domain> report --outcome <live|stopped|failed> [--tokens '<json>']
```

Then send it to Hostinger: pass `reports/<run>.json` unchanged to `hosting_headless_submit-build-report`
and run `report-sent <run>` (or `report-rejected <run>` on a 422). The `report` command prints the
exact path and run id. Don't ask first; see *Run log and build report* in the top-level `SKILL.md`
for failures. Then tell the user in one line: "Sent the build report to Hostinger to help improve
the flow." On a 422 say it's saved locally only; on any other failure say it'll be sent next session.

If the user asks for more changes after this report in the same session, call
`run-log.mjs <domain> run-resume --reason "<what they asked for>"` before the work. Then log as
usual and run `report` again when it's done. It updates this run's report in place, and the report
lists the follow-up. Send the updated report the same way.

- **Outcome:** `live` when the deploy succeeded this run, `failed` when a stage failed and you
  couldn't recover, `stopped` for everything else (the user paused, a dummy or missing step). Leave
  `--outcome` out and the script decides from the log.
- **Before you write it,** check that every issue, correction and skill gap from this run is in
  `events.jsonl`. Log any that are missing now; the report only shows what was logged.
- **After you write it,** read the `warning:` lines `report` prints. They list logging gaps: a stage
  that never ended, a start that was estimated, a stage logged with no duration, or (on a live build)
  a stage that was never logged. Fix what you can: `stage-end` an open stage, or correct a start with
  `stage-fix <stage> --started-ago <time>`, then run `report` again. What you can't fix stays in the report's
  *Logging gaps* section.
- **Tokens:** only what your tool tells you about your own usage (see *Run log and build report* in
  the top-level `SKILL.md`).
- In the final report's *Where state lives*, add the path to `report.html` so the user can open it.

Do this on every run, including the early stops: those reports are the most useful ones.
