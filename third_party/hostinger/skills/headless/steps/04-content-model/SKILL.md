---
name: headless-step-content-model
description: "Step 4 (content model) of the Hostinger Headless flow. Prepare phase: turns brief.md into a content helper (content-model.md) — fixed Title/Description plus a tailored generation prompt per section (Navigation, Pages, Articles) — and generates the drafts/images, no live backend needed. Push phase: routes to the backend subfolder to create it the backend's way once provision is ready."
---

# headless-step-content-model

Two phases around the **instance barrier** (see the top-level `SKILL.md`):

- **Prepare — no instance.** Build the content helper from `brief.md` and generate the content it
  calls for. Runs *during* the provision wait; needs only the brief.
- **Push — needs the instance.** Create that content in the backend. Gated on
  `provision.status == "completed"`; routes to `wordpress/` or `ecommerce/`.

**In:** `brief.md`. **Out:** `content-model.md` (+ any generated media under
`~/.hostinger/<domain>/media/`).

> Don't wait for provisioning — the helper comes from the brief alone.

---

## Prepare phase — write the content helper (no instance)

`content-model.md` is a lightweight helper, not a schema. Fill the **fixed values** from the brief and
write a **generation prompt** for each section — tailored to *this* site, not generic. Then run those
prompts to produce the drafts (and images), so the push phase is just upload.

Write `content-model.md` from this template, adapting every prompt to the brief's purpose, audience
and tone:

```markdown
# Content — <domain>

> Content helper prepared from brief.md on <today>. Fixed values are set; each prompt is run
> during the provision wait to generate the content and media. Push to the backend happens later.

## Title
<site name, from the brief>

## Description
<one–two line site description / default meta, from the brief>

## Navigation
> Generate the primary menu from the site's pages in reading order (<list the brief's pages>).
> Short labels; note which items are static pages vs. listing pages. Add a footer menu if the
> brief implies one (socials, contact).

## Pages
> Generate each page the brief lists. For every page: title, slug, a short section outline, the
> copy for static pages (e.g. About, Contact), and SEO title + description.
> <bullet the brief's pages with their one-line purpose>

## Articles (optional)
> Generate <N> articles across the brief's categories (<list them>). For each: title, slug,
> body in the brief's tone, category, any relationship (e.g. destination), published date, SEO,
> and a featured image (see *Images* below — Hostinger AI generation or Unsplash stock) with
> alt text. Omit if the brief has no article-like content.

## Products (optional — required for a commerce brief)
> Skip for a non-commerce brief. For a commerce brief, generate the catalog content here (prepare
> work, no instance): for each product — name, slug, SKU, short + long description in the brief's
> tone, price, the collection it belongs to, variants if any, and a product image (see *Images* —
> Hostinger AI generation or Unsplash stock) with alt text. Group products into the collections
> the brief implies, and generate any **coupons** the brief calls for (code, type, amount). The
> `ecommerce` push phase creates these on the store's sales channel; a **WordPress + WooCommerce** brief
> seeds them into WooCommerce instead (see `wordpress/SKILL.md` + `wordpress/woocommerce.md`) — there
> the **SKU is the idempotency key** and coupons + product categories are part of the catalog.
```

Guidance:

- **Fixed vs. prompt.** Title and Description are concrete values. Navigation, Pages and Articles are
  prompts because their volume/wording is generated — keep them as prompts so the push phase (or a
  rerun) can regenerate consistently.
- **Run the prompts now.** Generate the actual page copy and article drafts during the wait — this is
  the slowest work and the whole reason it runs in parallel. Images depend on the chosen source (see
  *Images* below): Unsplash photos and your own generated files can be produced now; Hostinger AI
  images only generate once the instance exists, so write their brief now and generate at the barrier.
  Put any generated/own media in `~/.hostinger/<domain>/media/` and reference it by filename. Record
  alt text for every image.
- **Optional sections.** Drop **Articles** if the brief has no article-like content. Drop **Products**
  for a non-commerce brief; for a commerce brief, generate the product catalog here (names, prices,
  descriptions, collections, images) — that's prepare work, and the `ecommerce` push phase then creates
  it on the store.
- **Don't block on design.** The design step (5) owns the look, and it runs in parallel during the
  provision wait, so never wait for it here. If `design.md` already exists when you source images,
  follow its **Imagery** section; otherwise generate neutral, on-topic imagery from the brief.

### Images — generate with Hostinger AI, or source stock from Unsplash

Every article (and every product) needs an image. There are two sources, and **you MUST offer the user
both and let them choose — never pick silently.** State the default for this backend in one line, name
the other option, and proceed on their answer ("you decide" = use the default; a skipped tool result is
not an answer, see *When you ask the user* in the top-level `SKILL.md`):

| Option | Tool | Backends | Needs the live instance? |
|---|---|---|---|
| **A — Hostinger AI image generation** *(default for WordPress / WooCommerce)* | `wordpress_ai-content_generate-images` | WordPress, WordPress + WooCommerce | **yes** — runs at the instance barrier |
| **B — Unsplash stock photos** *(default for Ecommerce / Webapp; the fallback everywhere)* | Unsplash API / web search | any | no — pure prepare work |

> **Do not silently fall back to stock on a WordPress site.** On WordPress / WooCommerce the default is
> **Hostinger AI (Option A)** — on-brand, generated from `design.md`. Using Unsplash on a WordPress build
> is only correct when **the user chose it**, or when **AI generation actually failed** (and then you say
> so). Taking stock because it is faster, synchronous, or avoids the async poll is a **defect**, not a
> shortcut: the async start → poll → upload-before-expiry flow (Option A below) is the expected work, not
> an optional extra. If you are tempted to skip it "for speed", stop and offer the user the choice instead.

If you can generate images yourself (some agents can), that's a third path: put the files in `media/`
and record alt text — no tool needed. **Record alt text for every image whichever source you use.**

**During the prepare wait, write an image brief for each image** into `content-model.md` no matter the
option (subject, `image_type`, aspect, and the alt text you expect). Option B can also *fetch* the
photo now (below); Option A only generates once the instance exists, so its briefs wait for the barrier.

#### Option A — Hostinger AI image generation (WordPress backends)

`wordpress_ai-content_generate-images` generates on-brand images for a live WordPress install, so it
runs **at the instance barrier** (after `provision.status == "completed"`), using the install from
`site.json` (`username`, and `wordpress.install_id` → the `software` path param). Follow `design.md`'s
**Imagery** section for look and palette. It is **asynchronous**:

1. **Start** one generation per image:

   ```json
   { "operation": "wordpress_ai-content_generate-images",
     "params": {
       "username": "<site.json username>",
       "software": "<site.json wordpress.install_id>",
       "prompt": "<what the image shows; for a logo, the wordmark + mark to render>",
       "image_type": "hero|background|inline|gallery|product|logo",
       "num_of_images": 1,
       "style": "<photographic style tokens from design.md; ignored for logo>",
       "color_guidance": "<logo only — colour direction, not rendered as text>" } }
   ```

   `prompt` (3–2500 chars) and `image_type` are required; `width`/`height` (128–2048) default per type
   and are ignored for `logo`. Returns `202` with a `generation_id` and `status: in-progress`.
   **Only one generation runs per install at a time** — a `409` means one is already running (and it
   returns no id), so wait for it to finish before starting the next. The endpoint allows 10
   requests/minute.

2. **Poll** `wordpress_ai-content_generation-result` with `{ username, software, generation_id }`
   every few seconds until `status` is `completed` (or `failed`). A completed result carries
   `result.images[]` — each with a **temporary** `url`, plus `width`, `height`, `content_type` — and
   `result.expires_at`.

3. **Use the images before they expire.** The URLs are short-lived, so in the push phase hand each
   `url` straight to WordPress with `media-upload-from-url`, which downloads and stores WP's own copy
   (see the wordpress push `SKILL.md`). Don't persist the temporary URL as the live image. There is no
   photographer to credit — leave `caption` empty or a short on-brand one. Record under the
   article/product in `content-model.md`:

   ```markdown
   Image: Hostinger AI (image_type: <type>, generation_id: <uuid>)
   Image alt: <what the image shows>
   Image file: <site>-<subject>.jpg
   ```

   On `failed`, retry once with a tightened prompt; if it fails again, fall back to Option B and note
   the gap. Never block the whole push on a single image.

#### Option B — stock photos from Unsplash (any backend, no instance)

This is still prepare work and needs no live backend: you pick the photos and record their URLs here,
and the push phase uploads them.

1. **Find candidates.** Use one photo per article, matching its subject and destination.
   - With an `UNSPLASH_ACCESS_KEY` in the environment, use the official API:
     `GET https://api.unsplash.com/search/photos?query=<subject>&orientation=landscape` with header
     `Authorization: Client-ID <key>`.
   - Without a key, use web search limited to `unsplash.com` (e.g. "unsplash photo Lisbon tram") and
     take the photo id from the result URL: the last segment of `unsplash.com/photos/<slug>-<id>`, or
     the whole segment for `unsplash.com/photos/<id>`.
   - Don't call `unsplash.com/napi/…`. It sits behind a bot challenge and returns 401.
2. **Resolve a direct file URL.** `GET https://unsplash.com/photos/<id>/download?force=true` (don't
   follow the redirect) answers `302` with `Location: https://images.unsplash.com/photo-<…>?…`. The
   `dl=` parameter in it also carries the photographer's name. Drop the query string and request a
   web size: `https://images.unsplash.com/photo-<…>?w=1600&q=80&fm=jpg&fit=max`. The upload ability
   needs this direct file URL, which returns 200 with `image/jpeg`. A photo *page* URL won't work.
3. **Look before you keep it.** Download a small preview (`?w=500`) and view it. Search snippets
   only show captions, and a photo often isn't quite what its title says. Reject anything off-topic.
   If nothing fits exactly, take the closest real photo and note the gap rather than mislabel it.
4. **Write alt text from what the photo shows**, not from the article's image brief. For example,
   use "Shopfronts and parked scooters on a Hanoi street" even if the article is about rain.
5. **Record it** under each article in `content-model.md`:

   ```markdown
   Image: https://images.unsplash.com/photo-<…>?w=1600&q=80&fm=jpg&fit=max
   Image credit: <Photographer> — https://unsplash.com/photos/<id> (Unsplash License)
   Image alt: <what the photo shows>
   Image file: <site>-<subject>.jpg
   ```

Unsplash photos are free to use under the Unsplash License. Still credit the photographer: the push
phase stores "Photo by <Photographer> on Unsplash" as the image caption.

Then update `state.json`: set `stage` to the next prepare stage still to do, fresh `updated_at`. Do
**not** advance past the barrier here.

---

## Push phase — create it the backend's way (needs the instance)

Only once `provision.status == "completed"` (re-verified against `hosting_websites_list-setups`),
route on the brief's **Suggested backend** and follow that subfolder, which maps the helper onto the
live backend — for WordPress, through the per-site WP MCP's ability tools (the installation JWT
authenticates that MCP session; `wp/v2` REST is the public read surface, not a write path for the
token) to create the menu, pages, posts, categories and media:

| Suggested backend | Follow |
|---|---|
| WordPress | `wordpress/SKILL.md` |
| WordPress + WooCommerce | `wordpress/SKILL.md` — pushes WP content **and** seeds the WooCommerce catalog (its WooCommerce section + `wordpress/woocommerce.md`) |
| Ecommerce | `ecommerce/SKILL.md` |
| Webapp | — (no push; skip to frontend) |

> **Supported backends: `wordpress` (optionally with a WooCommerce store), `ecommerce`, and `webapp`** —
> where `webapp` is "supported" by **skipping this whole stage** (it has no content backend; see the note
> below). A **WordPress + WooCommerce** brief routes to `wordpress/SKILL.md`, which pushes the WP content
> **and** seeds the WooCommerce catalog in the same push. PocketBase is not available in this version.
> Push to whichever single backend provision set up (see the provision router) — don't try to push to two
> backends here.
>
> **Webapp has no content backend.** There is no CMS or store to seed, so a `webapp` brief **skips this
> whole stage** — both prepare and push. The app owns its own data (its own API or database). Leave
> `content-model.md` unwritten, mark content-model `skipped` in the run log, and go straight to the
> frontend step.

After the push completes, update `state.json` and continue to the frontend **data** phase.
