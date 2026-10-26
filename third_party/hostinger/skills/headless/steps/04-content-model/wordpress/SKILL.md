---
name: headless-step-content-model-wordpress
description: "Push phase of Step 4 for a headless WordPress backend: open an authenticated session to the per-site WP MCP with the installation JWT, then create the content helper's Title/Description, categories, media, pages, posts and navigation through the MCP ability tools. wp/v2 REST is the public read surface, not a write path for this token. Idempotent, instance-gated."
---

# headless-step-content-model-wordpress

**Push phase — needs the live instance.** Run only after `provision.status == "completed"` (re-verify
against `hosting_websites_list-setups`). It maps the backend-agnostic `content-model.md` onto real
WordPress objects.

**In:** `content-model.md`, `site.json` (both prepared earlier), generated media under
`~/.hostinger/<domain>/media/`. **Out:** content created in WordPress; created IDs recorded back into
`content-model.md`.

## What creates what — and what authenticates it

The Hostinger **management** MCP (`wordpress_*`) is infra-only: it installs WordPress, plugins and
themes but has **no content endpoints**.

Writes go through the **per-site WP MCP** (the Hostinger AI Assistant plugin), authenticated with the
installation JWT. **The JWT authenticates the MCP endpoint only** — it is wired as the MCP server's
`authenticate_request`, and the plugin registers no global `determine_current_user` /
`rest_authentication_errors` filter. So a raw `POST /wp/v2/posts` with this token is **not**
authenticated; the admin user context (`wp_set_current_user`) exists only *inside* an MCP session.

| Surface | Base (from `site.json`) | Role |
|---|---|---|
| **Per-site WP MCP** | `urls.wp_mcp` (`mcp_url`) | **all writes** — create content through its ability tools |
| **WP REST API** `wp/v2` | `urls.rest_api` | **public reads only** (no auth needed) — what the Step 6 frontend consumes; do not write to it with the JWT |

> **The WordPress content model is posts, pages and categories** (plus media). For **SEO**, **Yoast**
> is already installed + activated at provision (every headless WordPress site — see provision Step 4),
> so meta + schema come from a maintained plugin and the frontend reads each item's `yoast_head_json`.
> This push only sets per-item Yoast meta (Step 4.7 below).

> **A store on this site? See [`woocommerce.md`](woocommerce.md).** When the brief's **Suggested
> backend** is `**WordPress + WooCommerce**` (`site.json → woocommerce.enabled: true`), this push also
> seeds the WooCommerce catalog — products, categories and coupons — through the **same per-site WP MCP
> session**, which exposes native `wc-products-*`, `wc-product-categories-*` and `wc-coupons-*` abilities
> (no custom plugin, no consumer key). Do the WordPress content below as normal, then run the **WooCommerce
> catalog** section before you hand off.

> **Needs more than posts and pages? See [`custom-plugins.md`](custom-plugins.md).** The per-site MCP can
> create content *data* but can't register a **custom post type**, a **custom taxonomy**, or a **global
> settings page** (footer text, phone, social links the frontend reads). When the content model calls for
> those, author a small custom plugin and deploy it into the headless `/cms` with
> `hosting_deploy { type: "wordpress-plugin", headless: true }`, exposing everything over REST for the
> frontend. **Deploy the plugin first** (the schema — the deploy activates it), then the steps below populate
> its entries through the MCP's native `cpt-create` ability (custom-taxonomy terms are seeded in the plugin — see the cookbook).

> **A contact form on this site? See [`contact-form.md`](contact-form.md).** When the brief's
> **Must-haves** include a contact form (`site.json → contact_form.enabled: true`), provision installed
> **Contact Form 7**; this push resolves the form's numeric id + field names (in the **same session**)
> and records them into `site.json` so the Step 6 frontend can submit to CF7's public feedback endpoint.
> Run the **Contact form** section after the WordPress content below.

## Step 1 — Open the authenticated MCP session

Mint a short-lived token through the Hostinger connector:

```json
{ "operation": "wordpress_installations_jwt-token",
  "params": { "username": "<site.json username>", "software": "<site.json wordpress.install_id>" } }
```

Returns `token` (+ `mcp_url`, already stored as `urls.wp_mcp`). Connect to `urls.wp_mcp` as an MCP
client (`initialize` → `tools/list` → `tools/call`) and send the token on **every** request as:

- `X-Hostinger-JWT-Token: <token>` — the plugin's preferred header (checked first), **or**
- `Authorization: Bearer <token>` — accepted as a fallback (case-insensitive `bearer ` prefix).

The token lives ~24 h — mint on demand, **never print, log, or write it to `site.json` /
`content-model.md`**. If a call returns `401/403` with `token_invalid`/`invalid_api_key`, the token
expired or was revoked → re-mint and reconnect.

> **Transport gotchas (streamable HTTP MCP).** The endpoint is session-based: `initialize` returns an
> **`Mcp-Session-Id` response header** — capture it and send it on **every** subsequent request
> (`tools/list`, `tools/call`), or they fail with `-32600 Missing Mcp-Session-Id header`. Send
> `Accept: application/json, text/event-stream`. After `initialize`, post the `notifications/initialized`
> notification, and **tolerate a non-2xx on it** (it can answer 404 with no body — harmless; don't let
> it abort the session). A raw curl/HTTP client works fine for all this.

## Step 2 — Discover the ability tools

The server advertises either every ability as its own tool, or three **discovery meta-tools**
(discover → get-info → execute) to keep `tools/list` small. Call `tools/list` first and work with
what's there; with discovery, list abilities, then execute by ability name. The content tools that
cover this step (exact names come from discovery — don't hardcode them):

`SettingsTools` · `CategoriesTools` · `TagsTools` · `MediaUploadTools` / `MediaTools` · `PagesTools` ·
`PostsTools` · `MenusTools` / `NavigationTools` · `SeoTools`, plus **`cpt-*`** for custom post types. There
is **no** generic `wp/v2` passthrough tool — every write goes through a dedicated ability, so a `wp/v2`
route with no matching ability (e.g. the terms of a *custom* taxonomy) isn't reachable from the MCP;
register and seed those in a custom plugin instead (see the backend's custom-plugins cookbook).

Seen on a live install (Hostinger AI Assistant, discovery mode): the meta-tools are
`hostinger-ai-discover-abilities`, `hostinger-ai-get-ability-info { name }` and
`hostinger-ai-execute-ability { name, parameters }`. The abilities are named
`hostinger-ai/<thing>-<action>`, e.g. `posts-create`, `posts-update`, `media-upload-from-url`,
`media-delete`. Call `get-ability-info` for each schema before using it. Results come back as
`{ ability, result: { data, … } }` for lists and `{ ability, result: {…} }` for single objects — so a
create answers **`200`** (not `201`) and the new object's `id` is **inside** `result` (`result.id`, or
`result.data.id`), never at the top level. A missing top-level `id` is not a failure; read it from
`result`.

## Step 3 — Idempotency rule (makes resume safe)

Every create is **list/get-by-slug first, then create only if absent** — a re-run must not duplicate.
Use the matching read ability (`posts-search`, `pages-search`, `categories-list`, `tags-list`,
`cpt-search`, `media-search`, …): a hit → reuse its `id`; empty → create. Capture each returned `id` and record the id map back into
`content-model.md` so later references resolve without re-querying.

## Step 4 — Create in dependency order

> **Custom types/settings? Deploy the plugin before this list.** If the content model needs a custom post
> type, taxonomy or global settings page, deploy that plugin **first** (the deploy activates it — see
> [`custom-plugins.md`](custom-plugins.md)) so its REST routes exist — then the steps below populate its
> entries through the MCP's native `cpt-create` ability, as they do core posts and pages (custom-taxonomy
> terms are seeded in the plugin — the MCP has no taxonomy-term path; see the cookbook).

0. **Remove WordPress's default content first.** A fresh install ships a **"Hello world!" post**
   (id 1), a **"Sample Page"**, and a default comment — they will otherwise show up on the live site.
   Delete the default post (`posts-delete { id: 1, force: true }`) and, if present, the sample page
   (find it via `pages-search` for slug `sample-page`, then `pages-delete`). This is idempotent: if
   they're already gone, skip. Leave the default `Uncategorized` category — it's harmless once no post
   uses it (the frontend only lists categories with posts).
1. **Site Title & Description** (the helper's global part) → the Settings ability.
2. **Categories / tags** — one per term in the helper → Categories / Tags abilities. Keep `name → id`.
3. **Media.** Upload every image in the helper, set `alt_text`, and keep `filename → id`. See
   *Media upload* below for all sources: a Hostinger-AI image URL, an Unsplash URL, or a generated
   file in `media/`. For a Hostinger-AI image, generate it now (its URL is temporary — see the
   content-model `SKILL.md`, *Images* Option A) and upload straight away, before `expires_at`.
4. **Pages** — each static/index page → Pages ability. Pass `title`, `content` and `excerpt` as
   **`{ "raw": "…" }` objects** (see the note below), plus `slug`, `status: publish`. Keep `slug → id`.
5. **Posts (articles)** — each → Posts ability: `title`, `content` and `excerpt` as **`{ "raw": "…" }`**
   (note below), plus `slug`, `status: publish`, `categories: [id]`, `tags: [id…]`,
   `featured_media: <id>`, `date`. (The plugin block-converts post content on insert via
   `rest_pre_insert_post`, so HTML bodies in `content.raw` are fine.)

   > **Create payload gotcha (`pages-create` / `posts-create`).** These abilities take `title`,
   > `content` and `excerpt` as WordPress's core **`{ "raw": "…" }` objects**, not bare strings. Pass a
   > bare string and the field is silently dropped — the create still answers `200`, so you get a
   > *published-but-empty* page or post with nothing to key off. Always send `{ "raw": "…" }` and
   > read the new `id` from `result` (see Step 2). Confirm the exact field shape with
   > `get-ability-info` if a schema differs.
6. **Navigation** — Menus / Navigation abilities: create the menu, then an item per nav entry
   referencing a page `id` (or a custom URL for listing routes). **Headless note:** the Step 6
   frontend renders nav from `content-model.md`, so the WP menu is for owners editing in wp-admin, not
   what the live site reads — create it, but it isn't the source of truth.
7. **SEO** — **Yoast SEO** (`wordpress-seo`) is already installed + activated at provision (Step 4 of
   the WordPress provision recipe), so it generates meta + schema and the frontend reads
   `yoast_head_json` per post/page. Here, just set each post's Yoast title/description if an ability
   exposes it; otherwise the excerpt + title are a fine fallback. Don't fail the push over SEO fields.
   If `site.json → seo.enabled` is `false` (the owner declined Yoast, or provision couldn't confirm the
   install), skip this and let the frontend generate tags from content — don't try to install the
   plugin from the content stage.

### Media upload

**From a URL (a Hostinger-AI image, Unsplash, or any direct file URL).** Use
`hostinger-ai/media-upload-from-url`. WordPress downloads the file and stores its own copy, so the
site never depends on the external URL staying up — which is exactly why a **Hostinger-AI** image
(whose `url` from `wordpress_ai-content_generation-result` is temporary) must be uploaded here, while
it is still valid; drop the Unsplash-only `caption`/`description` for AI images:

```json
{ "name": "hostinger-ai/media-upload-from-url",
  "parameters": {
    "url": "https://images.unsplash.com/photo-<…>?w=1600&q=80&fm=jpg&fit=max",
    "filename": "<site>-<subject>.jpg",
    "title": "<short title>",
    "alt_text": "<what the photo shows>",
    "caption": "Photo by <Photographer> on Unsplash",
    "description": "Source: https://unsplash.com/photos/<id> (Unsplash License)",
    "post_id": <post id, if the post already exists> } }
```

- `url` must return 200 with an image content type. A photo *page* URL fails.
- The result carries the attachment `id` and `source_url`. WordPress also generates the smaller
  sizes (`300x200`, `768x…`, `1024x…`, …) under `media_details.sizes`, which the frontend can use
  for `srcset`.
- Set `filename` yourself, so files in `wp-content/uploads/` have readable names.

**From a local file in `media/`.** Use the Media-upload ability that discovery lists for local
files.

**Set the featured image.** Pass `featured_media: <id>` when creating the post (Step 4.5). If the
post already exists (on resume, or when images are added later), use
`hostinger-ai/posts-update { id, featured_media }`.

**Idempotency trap: don't look up earlier uploads by filename.** `media-search` matches titles and
content, not filenames or the slug you passed. A search for `<site>-lisbon-tram` finds nothing even
though the file exists, so a re-run would upload the image again. WordPress then stores the duplicate
as `…-1.jpg` and silently repoints the post at it. Check this way instead:

1. `posts-get { id }`. If `featured_media` is already set, skip that post. Its image exists.
2. Otherwise, search by the **title** you set on upload (`media-search { search: "<title>" }`),
   and reuse a hit.
3. Only upload when both checks come up empty.

If duplicates do slip in, point each post back at the original with `posts-update`, then delete the
duplicates with `media-delete { id, force: true }`.

## Step 5 — Verify and record

- Read a couple of created objects back through `wp/v2` (public GET, no auth): e.g.
  `GET {urls.rest_api}/posts?per_page=1` and check the `X-WP-Total` header against the planned article
  count; fetch one post with `_embed` to confirm `featured_media` and `categories` resolved.
- Media: `GET {urls.rest_api}/media?per_page=1` → `X-WP-Total` equals the number of images planned
  (more means duplicates). `GET {urls.rest_api}/media?include=<ids>` confirms `alt_text` and
  `caption` on each image. Each `source_url` must return 200 with an image type. Each post's
  `featured_media` must point at its image.
- Write the created-id map into `content-model.md` (a `## Created in WordPress` section: object → slug
  → id) so the frontend data phase and any re-run resolve references directly. Include one row per
  media item: filename, credit and source page, the post it's featured on, and its id.

## WooCommerce catalog *(only for a `WordPress + WooCommerce` brief — skip otherwise)*

When `site.json → woocommerce.enabled` is `true`, also seed the store **in this same authenticated MCP
session**, using WooCommerce abilities the Assistant exposes alongside the content ones. Full recipe (incl.
the storefront Store API and the checkout gate): [`woocommerce.md`](woocommerce.md). In short:

1. **Product categories** — `wc-product-categories-list` (reuse by slug/name) else
   `wc-product-categories-create { name, slug }`. Keep `name → id`.
2. **Products** — **idempotent by SKU**: `wc-products-search { sku }` → reuse, else
   `wc-products-create { name, type:"simple", sku, regular_price:"<decimal>", description, status:"publish",
   categories:[{id}] }`. For images, `media-upload-from-url` then `wc-products-update { id, images:[{id}] }`.
3. **Coupons** — **idempotent by code**: `wc-coupons-search { code }` → reuse, else
   `wc-coupons-create { code, discount_type, amount }`.
4. **Verify over the public Store API** (no auth): `GET {urls.store_api}/products?per_page=100` count +
   `prices` (minor units), `GET {urls.store_api}/products/categories`. Record the SKU→id map, category ids
   and coupon codes into `content-model.md` under `## Created in WooCommerce`.

> **Don't seed or test checkout here.** A fresh WooCommerce install has no payment gateway/shipping and
> that config isn't reachable headlessly (`site.json → woocommerce.payment_enabled` is `false` — the owner
> finishes it in wp-admin). Seeding + verifying the catalog over the Store API is the whole job; never call
> `/checkout` or block on it. See the cookbook §4.

## Contact form (Contact Form 7) *(only when `site.json → contact_form.enabled` is true — skip otherwise)*

Provision installed Contact Form 7. Here, resolve the form the frontend submits to, deploy a tiny
spam-guard plugin (a headless honeypot), and record both into `site.json`. Full recipe:
[`contact-form.md`](contact-form.md). In short:

1. **Find the form id (idempotent).** The per-site MCP has **no generic REST ability** and
   `wpcf7_contact_form` is not a public CPT, so read the id by **probing the public feedback endpoint**:
   a **`multipart/form-data`** `POST {urls.cms}/wp-json/contact-form-7/v1/contact-forms/<id>/feedback` with
   `_wpcf7_unit_tag=wpcf7-f<id>-o1`, for `id` in `1`‒`30`. The hit is the id whose `200` JSON reply carries
   `"contact_form_id": <id>` (plus a CF7 `"status"`) — the default **"Contact form 1"** (fields `your-name`,
   `your-email`, `your-subject`, `your-message`); `404`/`wpcf7_not_found` is a miss, and anything else
   (`415`, `403`, `429`, `5xx`) is inconclusive, never a hit. **The content type matters:** CF7 answers
   `415` to a non-multipart body *before* it looks up the id, so a bare POST would wrongly pick id 1. Reuse
   it on re-run. CF7's default mail already sends to `[_site_admin_email]`, so no recipient change is needed.
   *(Fallback if nothing answers: hand the owner the one-click wp-admin login — `wordpress_login_create-links`
   — to read the id from Contact → Contact Forms, the WooCommerce-checkout-gate owner-handoff pattern.)* See
   the cookbook for the full method.
2. **Deploy the spam guard (honeypot).** The `contact-form-7-honeypot` add-on can't work headlessly (it
   needs a `[honeypot]` form-tag only an owner can add), so deploy a ~15-line `wpcf7_spam` plugin to `/cms`
   with `hosting_deploy { type: "wordpress-plugin", slug: "cf7-headless-spamguard", headless: true }` — it
   flags a submission as `spam` (no mail) when a fixed decoy field (`your_website`) is filled. Cookbook §2b.
3. **Record into `site.json`** — fill the `contact_form` block provision started: `form_id`,
   `feedback_url` (`{urls.cms}/wp-json/contact-form-7/v1/contact-forms/<form_id>/feedback`), `fields`
   (the form's input names, e.g. `["your-name","your-email","your-subject","your-message"]`) and
   `honeypot_field` (`"your_website"`, the decoy the frontend renders empty). Note the form id in
   `content-model.md` under `## Created in WordPress`.

> **Don't send a real test here.** Resolving the form id + fields is the whole job for this stage; the
> throwaway `mail_sent` test belongs to **validate** (Step 7), so one dummy email reaches the owner, not
> several. See the cookbook for the feedback contract and the hidden `_wpcf7*` fields the frontend needs.

## Step 6 — Hand off

Update `state.json` (`provision` stays `completed`; advance `stage` toward the frontend **data**
phase) with a fresh `updated_at`. The backend now holds the content; Step 6's data wiring points the
frontend at `urls.rest_api` (and, for a store, `urls.store_api`).
