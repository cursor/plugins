---
name: headless-step-content-model-ecommerce
description: "Push phase of Step 4 for a Hostinger Ecommerce backend: create the catalog through the hostinger-ecommerce MCP — products (physical/digital) priced in minor units, product images from URLs, optional variants — on the store from site.json. Verified against the public Storefront V2 API. Idempotent, instance-gated."
---

# headless-step-content-model-ecommerce

**Push phase — needs the store.** Run after provision created the store + custom sales channel (ids in
`site.json → ecommerce`). All writes go through the **`hostinger-ecommerce`** MCP (`ecommerce_*`,
OAuth). Prices are **integers in minor units** (cents) and live on **variants**.

**In:** `content-model.md` (prepared catalog), `site.json` (`ecommerce.store_id`). **Out:** products +
images created in the store; ids recorded back into `content-model.md`.

> If the `hostinger-ecommerce` MCP tools aren't available, don't stop — see the prerequisite in
> `../../03-provision/ecommerce/SKILL.md` (add the server, and if you can't reconnect your session,
> drive the stdio server directly rather than blocking).

## Step 1 — Create products (idempotent)

List first so a re-run doesn't duplicate: `ecommerce_products_list { store_id }` — match by title/slug;
reuse existing ids. For each product in the helper:

```json
{ "operation": "ecommerce_products_create-physical",
  "params": { "store_id": "store_…", "name": "…", "price": 3999, "description": "…" } }
```

- `price` is minor units (3999 = $39.99); currency defaults to the store's. Each create makes one
  **variant** (its `id` is what checkout needs — read it from the product detail/list).
- Digital goods: `ecommerce_products_create-digital` (takes a `download_url`).
- Multiple variants (sizes/flavours): `ecommerce_product-variants_create { store_id, product_id,
  options:[{name,value}], prices:[{amount}] }`.
- Batch several creates with `multi-execute` to keep it fast.

## Step 2 — Product images (one call each)

`ecommerce_products_upload-and-attach-image { store_id, product_id, image_url, is_thumbnail: true }` —
fetches the image from a public URL and attaches it (raster only, no SVG, ≤15MB, HTTPS, ≤1 redirect).
Unsplash direct URLs (`https://images.unsplash.com/photo-…?w=1200&q=80&fm=jpg&fit=max`) work directly.
Source images as in the parent `../SKILL.md` (Unsplash). The store stores its own CDN copy
(`cdn.zyrosite.com`), so the storefront never depends on the source URL.

> Idempotency: check the product's existing `images`/`thumbnail` before attaching so a re-run doesn't pile
> on duplicates.

## Step 3 — Collections

The API does not expose a collection-create op in this flow, and `product_collections` comes back empty.
Represent collections (e.g. Proteins / Supplements) as a **frontend mapping** in the storefront
(`lib/site.ts` → product-slug → collection), and record that mapping in `content-model.md`. If a real
collection API becomes available, prefer it.

## Step 4 — Verify (public Storefront V2, no auth)

Keyed on the **sales channel** (`site.json → ecommerce.sales_channel.id`):

- `GET https://api-ecommerce.hostinger.com/v2/channels/<scha_*>/products?limit=100` → all products, each
  with `variants[].prices[]` (amount in minor units + currency `decimal_digits`/`template`), `thumbnail`
  and `images[]`. Count matches the plan.
- Detail resolves by **product id** (`…/products/<id>`); a **slug 404s** on detail — map slug→id from the
  list in the frontend.

## Step 5 — Hand off

Record the id map in `content-model.md` (`## Created in the store`: product → slug → id → variant id →
price → image). Update `state.json` (advance `stage` toward frontend; leave `provision`). The storefront
(Step 6) reads the public Storefront V2 API for the channel; checkout is
`POST /channels/<scha_*>/checkout` (needs a payment method — see the provision payment gate).

> **No payment method = no checkout to seed or verify.** When `site.json → ecommerce.payment_enabled`
> is `false` (free account / no paid Ecommerce plan — see the provision gate), the catalog push here is
> **complete on its own**. There is nothing to seed for checkout, and you must **not** test the checkout
> endpoint or wait on it — seeding products and verifying them over the Storefront V2 API is the whole
> job. Hand off normally.
