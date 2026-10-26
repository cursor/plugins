---
name: headless-step-frontend
description: "Step 6 (frontend) of the Hostinger Headless flow. Builds the website that renders the backend's content. Figures out (or confirms) the framework — defaulting to Next.js SSR — implements the look already chosen in design.md (the design step's contract), and builds the source into src/. Only ask for the clarifications you actually need."
---

# headless-step-frontend

Build the site's frontend against the backend from `site.json`, implementing the look the design step
already chose and wrote to **`design.md`** (plus the logo in `brand/`). The design is decided; this step
is where it becomes real code. There's no per-framework recipe — use good judgement, follow `design.md`
as the contract, and ask only for the clarifications you genuinely need. **Out:** source in the site
workspace `~/.hostinger/<domain>/src/`.

> ## ⚠️ Build mode: "Bring your own frontend"? Read this first (any backend)
> Read `brief.md` → **Build mode**. When it is **Bring your own frontend**, the user already has a
> frontend (the project in the folder the command was run in) and this step **wires it to the backend
> from `site.json` — it does not scaffold a new project and there is usually no `design.md` to
> implement** (the design step deferred to the user). **Use their project as the source**: copy or
> point `~/.hostinger/<domain>/src/` at it, keep its framework and UI, and collaborate on changes at
> the user's direction (vibe-code with them). Your job is to connect it to the live backend (WordPress
> `wp/v2` reads, the WooCommerce/Ecommerce Store API, env/keys) and make it deployable (set
> `engines.node` to `22`, remove any `.htaccess`), then hand off to deploy. This generalises the Webapp
> "existing app" case below to WordPress and Ecommerce too. When **Build mode is "Agent designs and
> builds"**, ignore this box and proceed normally (scaffold + implement `design.md`).

> ## ⚠️ Webapp backend? Read this first
> A `webapp` brief has **no CMS/store and no `content-model.md`** — the app owns its own data (its own
> API, or the MySQL database recorded in `site.json → database`). It comes in two shapes, decided back in
> **refine**:
>
> - **An existing app the user brought to deploy** (refine routes "deploy my app" here). **Use their
>   project as the source** — copy/point `~/.hostinger/<domain>/src/` at it and keep its own framework and
>   UI. **Do not scaffold a new project, and do not re-implement `design.md` over it** (so **the design
>   step does not apply** to an app that brings its own UI). Your job is only to make it deployable: set
>   `engines.node` to `22`, remove any `.htaccess`, wire its data/env, then hand off to deploy. **Skip the
>   Step 2 design pass**, and ignore the `content-model.md` requirement in Step 3.
> - **A new app built from the brief.** Scaffold and build it from `brief.md` (and `design.md` if the
>   design step produced one — design *does* run for a from-scratch app). Its data is owned by the app, so
>   there is still **no `content-model.md`** to bind against.
>
> Framework choice (Step 1), the build, and hand-off (Step 4) apply to both. The per-backend bullets in
> Step 3 are **WordPress / WooCommerce / Ecommerce only** — for a webapp follow the Webapp bullet there.

## Step 1 — Pick the framework (guess → default → confirm)

**The rendering is already decided in `brief.md` → Rendering** (SSR or SSG, set during refine). Honour
it, and the backend constraint:

- **Ecommerce → SSR required** (carts/search need per-request rendering). Any SSR framework works —
  Next.js is the default, not a requirement (Express, Nuxt, SvelteKit, etc. are all fine).
- **WordPress + WooCommerce → SSR required** (same reason — cart/checkout need per-request rendering).
- **WordPress → SSG (Astro)** when the brief says SSG, otherwise **SSR (Next.js default)**.
- **Webapp → the app's own stack.** An **existing app** keeps its current framework (don't impose one); a
  **new app** uses whatever fits the brief (SSR or SPA). Either way it deploys as a Node.js app (Step 8) —
  an SSR app runs a server, a SPA builds to static output.
- Map rendering → framework: **`ssr` → Next.js**, **`ssg` → Astro** — unless the brief/prompt explicitly
  names another supported framework, in which case use that.

Supported frameworks (what the Hostinger build pipeline can deploy — the `app_type` in Step 8 deploy):

- **Server/SSR-capable:** Next.js, Nuxt.js, Astro, SvelteKit, Express, NestJS, Fastify.
- **Static / SPA:** React, Vue, Angular, Vite, Parcel, Preact, Svelte, (Astro / SvelteKit static too).

Confirm the framework with the user in one line only if the brief left it open. Record the choice in
`state.json`:

```json
{ "frontend": { "framework": "nextjs", "rendering": "ssr" } }
```

If the brief is silent, default to **Next.js SSR**. Ecommerce must be SSR (never SSG) — but the SSR
framework itself is free to be any supported one, not just Next.js.

## Step 2 — Implement `design.md` (don't re-design)

The look was already chosen and written by the design step. **Read `~/.hostinger/<domain>/design.md` and
implement it faithfully** — tokens (colour, type, spacing), components, per-page composition, imagery and
accessibility — plus the logo files in `brand/`. Don't re-run design questions or invent a new direction here.

- Treat `design.md` as the contract: the built pages should match its tokens, type scale, components and
  per-page composition, and the 8-point grid / WCAG 2.2 AA rules it carries.
- Use the **logo** from `brand/` as-is (wordmark, icon mark, favicon); never recolour or redraw it.
- If `design.md` is **missing** (e.g. a resumed older build), fall back to `brief.md → Design direction`
  (reference site, colours, brand, adjectives) and a tasteful, accessible default — but prefer `design.md`
  whenever it exists.
- **Don't gate on approval here** — the result is shown at **validate** (Step 7).

**Only ask about the code, and only if it matters** (design decisions belong in the design step):
- Where the **source should live** — default `~/.hostinger/<domain>/src/`; ask only if they want a
  specific folder or an existing repo.
- **Git** — initialise / connect / push (default: a local project, no remote).
- A specific **component library** or technical must-have, if they implied one.

## Step 3 — Build against the backend

Two phases around the instance barrier (see the top-level `SKILL.md`): scaffold + build the shell while
provision settles, then wire live data once `provision.status == "completed"`.

Read the backend from `site.json`:

- **WordPress** → `urls.rest_api` (`wp/v2`), public read. Content is in the posts/pages/categories/media
  the content-model push created; nav/plan come from `content-model.md`. Map each item's **SEO** from its
  `yoast_head_json` into the page `<head>` (title, description, Open Graph, JSON-LD schema) — Yoast is
  installed by default at provision (`site.json → seo.enabled: true`). If `seo.enabled` is `false`
  (Yoast absent), fall back to generating per-page title/description/OG tags from each item's content.
  - **Contact form** (`site.json → contact_form.enabled: true`, any WordPress backend) → render the
    contact page's form and submit it **client-side** to Contact Form 7's public feedback endpoint. Put a
    `submitContactForm(data)` helper in the one data module: build a `FormData` with the field names from
    `contact_form.fields` (e.g. `your-name`, `your-email`, `your-subject`, `your-message`) **plus CF7's
    hidden fields** — `_wpcf7` = `contact_form.form_id`, `_wpcf7_version`, `_wpcf7_locale` (e.g. `en_US`),
    `_wpcf7_unit_tag` (any stable string), `_wpcf7_container_post` = `0` — and `POST` it to
    `contact_form.feedback_url` **without setting `Content-Type`** (let the browser add the multipart
    boundary). `/cms` is same-origin, so no CORS and no secret. Branch on the JSON `status`: `mail_sent`
    → success state; `validation_failed` → map `invalid_fields[].field` to per-input errors;
    `spam`/`aborted`/`mail_failed` → a generic "couldn't send, try again" message. Include the honeypot
    decoy field named in `contact_form.honeypot_field` (e.g. `your_website`), rendered hidden/off-screen,
    **empty**, `autocomplete="off"`, `tabindex="-1"` — the deployed spam guard rejects it if filled. A user
    validation error is a **normal UI state, not a build error**. When `contact_form.enabled` is `false` or absent, render the contact page with
    plain contact details and **no form** — graceful, like disabled checkout; never half-build. Full
    contract: `../04-content-model/wordpress/contact-form.md` §3.
- **WordPress + WooCommerce** (`site.json → woocommerce.enabled: true`) → the WordPress bullet above **plus**
  the store. Read the catalog over the **public WooCommerce Store API** (`site.json → urls.store_api`,
  `/cms/wp-json/wc/store/v1`, no auth, open CORS): `GET /products` (prices are **integer minor units** on
  `prices.price` with `prices.currency_minor_unit` — divide to display), `GET /products/categories`. Cart,
  coupons and checkout are **client-side** against the Store API with the `Nonce` + `Cart-Token` headers
  (`GET /cart`, `POST /cart/add-item`, `/cart/apply-coupon`, `POST /checkout`) — see
  `../04-content-model/wordpress/woocommerce.md`. **Never embed a consumer key client-side**; the
  storefront is fully public. Blog/pages on the same site still come from `urls.rest_api` (`wp/v2`) + Yoast.
  - **Honour `site.json → woocommerce.payment_enabled`.** It is `false` until the owner enables a payment
    gateway + shipping in wp-admin (that config isn't reachable headlessly — see the provision note). While
    `false`, build the full catalog, product pages and the client-side cart as normal, but render a
    graceful disabled-checkout state (e.g. a disabled "Checkout" with "Checkout isn't set up yet"), **don't
    call `/checkout`**, and don't treat it as a build error. When `true`, wire checkout (`payment_method`
    `"cod"` works out of the box).
- **Ecommerce** → the **public Hostinger Storefront Core V2 API** (`https://api-ecommerce.hostinger.com/v2`,
  no auth, open CORS), keyed on the **custom sales channel** (`site.json → ecommerce.sales_channel.id`):
  `GET /channels/<scha_*>/products` (prices are **minor units** on variants), `POST /channels/<scha_*>/checkout`
  for buying. Cart is client-side; never embed a token. Read
  `ecommerce_miscellaneous_custom-storefront-setup-instructions` for the authoritative, current guide.
  - **Honour `site.json → ecommerce.payment_enabled`.** When it is `false` (free account / no paid
    Ecommerce plan — see the provision gate), there is **no checkout**: build the full catalog, product
    pages and the client-side cart as normal, but **do not call the checkout endpoint**. Instead render
    a clear, graceful state at the checkout step — e.g. a disabled "Checkout" button with a short note
    like "Online checkout isn't available on this plan yet" (and/or a contact/enquiry fallback). A
    missing checkout is **not** a build error here — never leave the storefront half-built, throw, or
    retry checkout because payment is off. When `payment_enabled` is `true`, wire checkout normally.
- **Webapp** → **no `content-model.md` and no headless backend to read**. The app uses its own data source:
  the MySQL database from `site.json → database` (through the `DB_*` / `DATABASE_URL` env vars — set at
  provision/deploy, see `../03-provision/webapp/SKILL.md` Step 3; `127.0.0.1` only resolves on the server,
  not locally), or whatever external API the app calls. For an existing app, keep its data layer as-is.

Guidelines (framework-agnostic):

- **One data module** is the single place that talks to the backend (e.g. `src/lib/data.ts`) — one file
  to inspect, one base URL to switch. Keep it swappable so the shell can build against stubs first.
- **Fetch at request time for SSR** (fresh content, no rebuild); a static build fetches at build time.
- **A failed or incomplete fetch is an error, not a silent empty/placeholder.** Planned content missing
  from the API is a build error too — a site that builds with holes ships with holes. *(WordPress/Ecommerce;
  a webapp has no planned content to check.)*
- **`content-model.md` is the source for what should exist** (pages, nav, collections mapping) — for
  WordPress/Ecommerce only; a **webapp has no `content-model.md`**.
- **No `.htaccess`** in the project (deploy would overwrite the live one); don't commit `node_modules`
  or build output.
- Set `engines.node` to `22` (the deploy builds on Node 22).
- **Next.js 16+ only:** set the `build` script to `next build --webpack`, not plain `next build`. Next.js
  16 defaults `next build` to **Turbopack**, whose native compiler needs a newer glibc than the Hostinger
  build server has, so a Turbopack build fails on deploy and won't fall back to webpack. Webpack builds
  clean there. The `--webpack` flag exists only on Next.js 16+; on **Next.js 15.x** leave the build script
  as plain `next build` (it already defaults to webpack). (Alternative: pin Next.js to `15.x`, keeping
  plain `next build`.)

## Step 4 — Hand off

Confirm the project builds clean locally against the live backend, no placeholder/fixture content
remains, and `state.json → frontend` matches what you built. Update `state.json` (`stage: "validate"`).
Validate (Step 7) owns the clean rebuild + user preview; deploy (Step 8) ships it with the `app_type`
and output directory that match the chosen framework + rendering.

> **Webapp:** just confirm the app builds clean and `state.json → frontend` is right — there's no
> `content-model.md` or headless backend to check. A DB-backed app can't reach its database locally
> (`127.0.0.1` is server-only), so its data layer is verified **after** deploy, not here.
