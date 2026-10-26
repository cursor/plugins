---
name: headless-step-deploy
description: "Step 8 (deploy) of the Hostinger Headless flow. Archives the frontend source, then deploys through the connector's one-shot hosting_deploy (type nodejs — it uploads the source, runs npm install and the build on the server) with the chosen framework's build settings (appType + output dir) passed explicitly, polls to completion with hosting_get-deployment, verifies the live site and that the backend survived, then writes deploy.json."
---

# headless-step-deploy

Ship the frontend to the live domain through the Hostinger connector. You hand the connector a zip of
the project **source** and it uploads it, runs `npm install` + the build script on the server, and
serves the result. **Out:** `deploy.json`.

This is an **instance-barrier** step: run it only after `provision.status == "completed"` and validate
(if run) has passed. All operations go through the connector (`execute`).

**In:** the project in `~/.hostinger/<domain>/src/`, `site.json` (`username`, `urls`), `state.json`
(`frontend.framework`, `frontend.rendering`).

> ## ⚠️ The one rule that makes this work: pass build settings explicitly
> If you let `hosting_deploy` **auto-detect** build settings, for a headless site that detection returns
> **null** (`appType:null`, `outputDirectory:null`, Node 20) — the build "completes" but the **root
> serves 403** (no `appType`/output → the vhost serves a directory with no entry). This is reproducible.
> **Always pass `appType`, `outputDirectory`, `nodeVersion`, `buildScript`, `packageManager` and
> `rootDirectory` on the `hosting_deploy` call** with the framework's values; the deploy then resolves
> them and serves correctly, and `/cms` is preserved.

## Build configurations

Map `frontend.framework` (from `state.json`) to its `appType` + build output directory, and pass those
on the `hosting_deploy` call. `appType` is the framework's value, e.g. `next`, `nuxt`, `astro`,
`svelte-kit`, `nest`, `express`, `fastify`, `react`, `create-react-app`, `gatsby`, `vite`, `vue`,
`angular`, `parcel`, `svelte`, `other`.

Common cases (all `nodeVersion: 22`, `buildScript: "build"`, `packageManager: "npm"`, `rootDirectory: "."`):

| Framework / mode | Local config | `appType` | `outputDirectory` |
|---|---|---|---|
| **Next.js — SSR** *(default)* | `output: 'standalone'` | `next` | `.next` |
| **Nuxt — SSR** | default | `nuxt` | `.output` |
| **SvelteKit — SSR** | node adapter | `svelte-kit` | `build` |
| **Astro — static** | `output: 'static'` | `astro` | `dist` |
| **Vite / React / Vue — static (SPA)** | — | `vite` (or `react`/`vue`) | `dist` |
| **Express / NestJS / Fastify — server** | — | `express`/`nest`/`fastify` | build output dir |

SSR/server frameworks run a persistent Node process (root sends `x-powered-by` / `cache-control: no-store`);
static frameworks serve their output dir as files. If unsure of a framework's output dir, check the
framework's own build output, but **always pass `appType`/`outputDirectory` on the deploy call with the
framework's correct values** — don't rely on auto-detection (it returns null → 403).

> ## ⚠️ Next.js 16+: build with webpack, not Turbopack (recurring deploy failure)
> Next.js 16 makes **Turbopack** the default bundler for `next build`. Turbopack's native (Rust)
> compiler needs a newer **glibc** than the Hostinger build server ships, so the server build aborts
> with a "glibc too old" error — and Turbopack **does not fall back** to webpack on its own, so the
> deploy fails every time. **Fix: build with webpack.** On **Next.js 16+** the project's `build` script
> in `package.json` must be `next build --webpack` (not plain `next build`); `buildScript` on the deploy
> call stays `"build"` — that's what runs it. The `--webpack` flag exists only on Next.js 16+; on
> **Next.js 15.x** leave the build script as plain `next build` (it already defaults to webpack).
> **Confirm this in `package.json` before deploying** (the frontend step scaffolds it this way — see
> `../06-frontend`). Alternative, only if you must avoid the `--webpack` flag: pin Next.js to `15.x`
> (keeping plain `next build`), whose `next build` still defaults to webpack. Next.js only — other
> frameworks are unaffected.

## Step 1 — Pre-flight

1. **Instance live.** `provision.status == "completed"`, re-verified with
   `hosting_websites_list-setups { "domain": "<domain>" }`.
2. **Build output exists locally** (the framework's output dir — e.g. `.next/`, `dist/`, `.output/`) and
   the project builds clean (frontend/validate already did this). If not, go back.
   - **Next.js 16+:** `package.json`'s `build` script is `next build --webpack`, not plain `next build` —
     the server's glibc can't run Turbopack's native compiler (see the box above). On Next.js 15.x leave it
     as plain `next build`. Fix it here if it isn't.
3. **Env vars (only if used).** Build-time vars (e.g. `NEXT_PUBLIC_*`) must be set **before** the build
   with `hosting_nodejs_replace-environment-variables` (full replace). Never put secrets in the repo or
   the archive. **Webapp with a database:** that full replace wipes the `DB_*`/`DATABASE_URL` that
   `hosting_databases_setup-website` injected (the generated password reads back masked), so set all app
   vars in the same replace and, if you can't, first reset the password with
   `hosting_databases_change-password` and resend every `DB_*`/`DATABASE_URL` — see
   `../03-provision/webapp/SKILL.md` Step 3.

## Step 2 — Archive the source

Zip the project **source** with `package.json` at the archive root. **Include** the app/source,
`public/`, the framework config (`next.config.mjs` / `astro.config.mjs`), `tsconfig.json`,
`package.json`, `package-lock.json`, `.nvmrc`. **Exclude** `node_modules/`, the build output
(`.next/`, `dist/`, `out/`), `.git/`, and any `.htaccess` — the server installs and builds from source.

```bash
cd ~/.hostinger/<domain>/src
zip -r -X ../app.zip . -x 'node_modules/*' '.next/*' 'dist/*' 'out/*' '.git/*' '**/.htaccess'
```

## Step 3 — Deploy (one shot: settings + upload + build)

Pass the framework's build settings **inline** on the deploy call — there is no separate settings step.
`path` is the archive from Step 2 (or the source directory itself; `hosting_deploy` archives a directory
for you, skipping `node_modules/`, `.git/` and `.env`, but it does **not** read `.gitignore`, so the
build output must already be absent).

```json
{ "operation": "hosting_deploy",
  "params": {
    "domain": "<domain>",
    "path": "/absolute/path/to/.hostinger/<domain>/app.zip",
    "type": "nodejs",
    "appType": "<framework appType, e.g. next>",
    "outputDirectory": "<framework output dir, e.g. .next>",
    "nodeVersion": 22,
    "buildScript": "build",
    "packageManager": "npm",
    "rootDirectory": "." } }
```

`hosting_deploy` uploads the source and triggers `npm install` + the build **end-to-end** — do not call
any upload or build operation yourself. It returns a build `buildUuid` at once. This **overwrites the
website root** (expected) and keeps `/cms` intact. Passing `appType`/`outputDirectory` explicitly is what
keeps the root from serving 403 (see the rule above).

## Step 4 — Poll to completion

Poll `hosting_get-deployment { "domain": "<domain>", "buildUuid": "<buildUuid>" }` with backoff until
`build.state` is `completed`. On `failed`, the same response carries the end of the build log and the
failure analysis — read it, fix locally, re-archive and redeploy (pass `fromLine`, the line count from
the previous call, to read only new log output). `hosting_get-deployment` also returns the build settings
stored for the site: `appType`/`outputDirectory`/`nodeVersion` should echo what you passed; if they read
`null`, the settings didn't take — fix the deploy call before continuing. For an SSR app that built but
hangs, `hosting_nodejs_restart-application { username, domain }` recovers the server without a rebuild.

## Step 5 — Verify the live site (all must pass)

| Check | How | Expect |
|---|---|---|
| Root serves | `GET https://<domain>/` | **200** (not 403 / 404) |
| SSR is live *(server frameworks)* | response headers | `x-powered-by` present, `cache-control: no-store` |
| Static serves *(static frameworks)* | `GET https://<domain>/` | 200 HTML with real home content |
| Key routes | a couple of planned routes + one deep route | 200, real content |
| **Backend survived** *(WordPress / WooCommerce)* | `GET https://<domain>/cms/wp-json/wp/v2/posts?per_page=1` | 200 |

> **Only WordPress (including WordPress + WooCommerce) has a `/cms` on the domain**, so the *Backend
> survived* check is WordPress-only.
> - **WordPress + WooCommerce:** also confirm the store survived the deploy —
>   `GET https://<domain>/cms/wp-json/wc/store/v1/products?per_page=1` → 200. There is nothing external to
>   link (no sales-channel step — that's Ecommerce only). **Checkout** stays owner-completed: when
>   `site.json → woocommerce.payment_enabled` is `false`, don't test `/checkout`; a catalog that serves 200
>   is a passing, complete deploy.
> - **Ecommerce:** the backend is the **Hostinger Ecommerce store**, read over the external Storefront API
>   (`api-ecommerce.hostinger.com`) — nothing a deploy touches lives on this domain. There is no `/cms`;
>   confirm the storefront still fetches products as a frontend check if you like. **Only check that
>   checkout can be reached when `site.json → ecommerce.payment_enabled` is `true`** — on a free account
>   (`payment_enabled: false`) there is no checkout, so **skip that check entirely**; a catalog that serves
>   200 is a passing, complete deploy. Never fail or hold the deploy because checkout is unavailable.
> - **Webapp:** no content backend at all — the whole root is the app. Skip the check; `/cms` won't resolve.

A `completed` build whose root 403s almost always means the build settings weren't passed to
`hosting_deploy` (null settings) — pass them and redeploy. Caching can briefly serve a stale root;
re-check after ~30 s.

## Step 6 — Record `deploy.json`

```json
{
  "build_uuid": "…",
  "stack": "nextjs",
  "rendering": "ssr",
  "app_type": "next",
  "output_directory": ".next",
  "node_version": 22,
  "method": "hosting_deploy (type: nodejs, settings passed inline)",
  "deployed_at": "…",
  "verified_at": "…",
  "urls": { "live": "https://<domain>", "cms": "https://<domain>/cms" },
  "checks": { "root": 200, "ssr_headers": true, "backend_preserved": true }
}
```

No secrets in `deploy.json`. The `urls.cms` field and the `backend_preserved` check above are
**WordPress-only** — adjust the record to the backend:

- **WordPress:** keep `urls.cms` and `checks.backend_preserved` as shown.
- **WordPress + WooCommerce:** keep `urls.cms` + `checks.backend_preserved` (it *is* WordPress), and add
  `urls.store_api` from `site.json`; no external link step.
- **Ecommerce:** omit `urls.cms`/`backend_preserved`; record the store URLs instead (`urls.storefront_api`,
  `urls.store_admin` from `site.json`) and link the custom sales channel to the live domain —
  `ecommerce_sales-channels_update { store_id, sales_channel_id, url }` (see the ecommerce provision step).
- **Webapp:** omit `urls.cms` and `backend_preserved` entirely — `urls` is just `{ "live": "https://<domain>" }`.

Update `state.json` (`stage` → `done`), then continue to Step 9 (done).

---

## Note — one deploy path, and never `type: "static"`

`hosting_deploy` is the only path: give its `path` either the source **directory** (it archives it for
you) or a local **archive** (`zip`, `tar`, `tar.gz`, `tgz`, `7z`) — there is no separate upload or build
step to fall back to. Either way pass the explicit `appType`/`outputDirectory`/`nodeVersion`/
`buildScript`/`packageManager`/`rootDirectory` from the table. Never deploy a headless site with
`type: "static"` — it serves the directory as plain files and can overwrite `/cms`.
