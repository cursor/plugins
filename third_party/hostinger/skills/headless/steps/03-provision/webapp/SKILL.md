---
name: headless-step-provision-webapp
description: "Provision a plain Node.js app host for the Hostinger Headless flow: create an empty website (no WordPress, no store engine, no /cms), optionally a MySQL database, then record it in site.json. For any webapp / SPA / app that brings its own code and data."
---

# headless-step-provision-webapp

Provision a bare **Node.js app host** for `<domain>` and prove it is ready. This is the backend for
**any webapp, SPA or app** that brings its own code (and, if it needs one, its own database) — there is
no CMS and no store engine here. The site is an **empty website**: just the hosting slot that the
frontend step builds into and the deploy step ships to as a Node.js application. **Out:** `site.json`.

> **Not WordPress, not Ecommerce.** Never provision `headless_wordpress` / `headless_ecommerce` for a
> webapp, and never install WordPress at `/cms`. A webapp owns its own routes, data and rendering.

All website/database operations below go through the Hostinger connector (`execute`).

> **Fire vs join (background provision).** Steps 1–2 up to `hosting_websites_start-setup` are the
> **fire** half: once the setup is queued, record `provision.in_progress` and return to do prepare work
> (see the router `../SKILL.md`). The readiness **poll** at the end of Step 2, plus Steps 3–5, are the
> **join** half — run them when an instance-barrier step needs the backend (or immediately, if the
> agent can't interleave). An already-`completed` site detected in Step 1 means provision is done:
> record `provision.completed` and adopt it.

## Step 1 — Detect before you create (never provision twice)

1. `hosting_websites_list { "domain": "<domain>" }` — substring filter, so **exact-match** the row's
   `domain`. If a row exists, note `username`, `order_id`, `website_type`.
2. `hosting_websites_list-setups { "domain": "<domain>" }` — exact-match the row:
   - `completed` → already provisioned → skip to Step 3 (adopt it).
   - `running` → skip to Step 2 (poll).
   - `failed` → tell the user and point them at hPanel; do **not** call start-setup again on your own.
3. If the site exists but is a different kind (`website_type` is `headless`, or a WordPress/store site),
   stop and tell the user — this domain already hosts something else.

## Step 2 — Create (only when nothing exists)

1. Pick the plan: `hosting_orders_list { "statuses": ["active"] }`. One active order → use it; several
   → ask the user which.
2. Start the setup as an **empty website** — **omit `type`** (no WordPress, no store):

   ```json
   { "operation": "hosting_websites_start-setup",
     "params": { "order_id": <order_id>, "domain": "<domain>" } }
   ```

   `domain` must be a **customer-owned** domain. For a temporary `*.hostingersite.com` subdomain,
   **omit `domain`** — the setup generates one itself and returns it in the response. Don't call a
   separate subdomain op to make one first: there's no need in this flow. (The API would also accept a
   subdomain you generated via `hosting_domains_generate-free-subdomain`, valid for 24 h from the client
   that made it — this flow just doesn't use that.) The response then carries the generated domain: if it
   differs from the workspace directory name, move `~/.hostinger/<old>/` to `~/.hostinger/<new>/`
   (if `<new>/` already exists, stop and ask instead of moving into it),
   update the domain in `brief.md`, and tell the user the new domain.
3. Poll `hosting_websites_list-setups { "domain": "<domain>" }` every ~15 s until `completed`
   (typically under a minute; allow a few minutes). `failed` → stop, point at hPanel.

## Step 3 — Database (only if the app needs one)

Skip this step entirely for an app with no database (static SPA, an app that talks to an external API).
This is **join-half** work — it needs the live website, so run it once `provision.status == "completed"`.

**Preferred — let the platform create the database and inject the credentials:**
`hosting_databases_setup-website { username, domain }` creates a MySQL database, **generates the
password, writes `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DATABASE_URL` into the
website's environment variables, and restarts the app — in one call.** The password is never returned,
so there is **nothing to persist and nothing to lose across sessions** — the app reads it from the
environment. (It 422s if any of those env vars already exist; clear them first with
`hosting_nodejs_replace-environment-variables`. Frameworks that bake vars into the build — Next.js,
`NEXT_PUBLIC_*` — only pick up the values on the deploy build.)

> **⚠️ A later `hosting_nodejs_replace-environment-variables` wipes these credentials.** That call is a
> **full replace**, and when you list the current vars first the `DB_PASSWORD` (and `DATABASE_URL`) read
> back **masked** (`********`) — the generated password is unknown, so you cannot resend it and the DB
> env is lost. One rule, pick one:
> - **(a) Set every other app env var first, and call `setup-website` last** — then nothing has to
>   replace the env again.
> - **(b) If a later replace is unavoidable**, reset the password with
>   `hosting_databases_change-password { username, name, password }` and resend **all** of `DB_HOST`,
>   `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` and `DATABASE_URL` with the new password in that same
>   full replace.

**Manual alternative** — only when you need a specific name/user or finer control:

1. `hosting_databases_create` with a name, a user, and a password you generate — name and user are
   prefixed with the account username automatically. Read the full, prefixed `name`/`user` back from
   `hosting_databases_list`.
2. **Which host the app connects to:** the app runs **on the website**, so Node.js connects to
   **`127.0.0.1:3306`** — never `localhost` (it can resolve to IPv6 `::1`, and not every database user
   has that grant), and never the external `host` from `hosting_databases_list` (`srvNNNN.hstgr.io`,
   which has no grant for connections from the server itself).
3. **Set the env vars now, while you still hold the generated password.** The password is **not persisted
   anywhere** (never in `site.json`), so set `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_NAME`, `DB_USER`,
   `DB_PASSWORD`, plus `DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/NAME` (URL-encode USER/PASSWORD)
   right here with `hosting_nodejs_replace-environment-variables` (a **full replace** — list current keys
   first; values come back masked; send the complete set with real values). Saving restarts the process;
   build-time vars need a fresh deploy (`hosting_deploy`) afterwards. **Don't defer this to deploy:** on
   a **cross-session resume** the generated password is gone, so you must **reset it** with
   `hosting_databases_change-password { username, name, password }` and set the env vars from the new one.
4. **Never** put the password in source, a committed `.env`, client-side JavaScript, or a chat reply;
   never print it once stored.

## Step 4 — Verify

| Check | How | Expect |
|---|---|---|
| Website exists | `hosting_websites_list` exact row | the row is present, `username` known |
| Setup finished | `hosting_websites_list-setups` exact row | `status: completed` |
| Database reachable *(only if created)* | `hosting_databases_list { username }` | the prefixed db + user are listed |

`GET https://<domain>/` returns the Hostinger default page (or 403) until the frontend is deployed —
expected, not a failure. There is **no `/cms` and no API** on this domain; the app itself serves every
route once it is deployed (Step 8).

If a check fails: retry once after ~30 s; if it still fails, stop and point the user at hPanel.

## Step 5 — Record `site.json`

```json
{
  "backend": "webapp",
  "website_type": "empty",
  "order_id": 1007223428,
  "username": "u…",
  "runtime": "nodejs",
  "database": {
    "enabled": false,
    "engine": "mysql",
    "name": "u…_appdb",
    "user": "u…_app",
    "host": "127.0.0.1",
    "port": 3306
  },
  "urls": {
    "site": "https://<domain>"
  },
  "provisioned_at": "…",
  "verified_at": "…"
}
```

No passwords or tokens in `site.json` — only the non-secret connection shape (host/port/name/user). Set
`"database": { "enabled": false }` (and drop the rest) when the app needs no database.

## Deploy & content model (what happens next)

- **Content model is skipped for a webapp** — there is no CMS or store to seed; the app owns its own
  data. The content-model router (`../../04-content-model/SKILL.md`) passes straight through to the
  frontend step for this backend.
- **Deploy** is a standard Node.js application deploy, handled by `../../08-deploy/SKILL.md`: it archives
  the **source** (not the build output; exclude `node_modules/`, `.next/`, `dist/`, build output and
  `.git/`), then deploys with `hosting_deploy` (`type: "nodejs"`, upload + server-side `npm install` +
  build, one shot) passing the framework's `appType` + `outputDirectory` inline, and polls
  `hosting_get-deployment` until the build completes. Any supported `appType` works (Next.js, Nuxt,
  Express, NestJS, Fastify, Vite/React/Vue SPA, …). There is no `/cms` to preserve here, so the whole
  root is the app.
