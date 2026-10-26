# headless — WooCommerce cookbook (headless store on WordPress)

A companion recipe to `SKILL.md` (WordPress content model). Use it whenever the WordPress backend carries
a **WooCommerce store** (`site.json → woocommerce.enabled: true`) — a brief whose **Suggested backend** is
`**WordPress + WooCommerce**` (one site: content **and** commerce).

**WooCommerce is not a separate backend.** It is the `woocommerce` plugin on a normal headless WordPress
install at `/cms` (installed in the provision step). This cookbook is the authoritative home for the store
data layer: how to **seed and CRUD** products, categories and coupons, and how the **storefront** reads
the cart, coupons and checkout.

---

## 1 — The one rule: drive the store through the per-site WP MCP

A **custom plugin cannot be installed into a headless `/cms`** from a coding agent (same limit that
removed `wp-development.md`). So there is **no seed plugin, no WP-CLI, and no REST consumer key in this
flow.** Instead, the **per-site WP MCP** (the Hostinger AI Assistant — the same JWT session the WordPress
content push uses, see `SKILL.md` Step 1) exposes **native WooCommerce abilities**. Seed and manage the
catalog through them, exactly as posts/pages are created.

Relevant abilities (names from `hostinger-ai-discover-abilities`; call `get-ability-info` for each schema
before use — they mirror the WooCommerce REST v3 shapes):

| Area | Abilities |
|---|---|
| Products | `wc-products-search` · `wc-products-get` · `wc-products-create` · `wc-products-update` · `wc-products-delete` |
| Categories / tags / brands | `wc-product-categories-{list,create,update,delete}` · `wc-product-tags-*` · `wc-product-brands-*` |
| Coupons | `wc-coupons-{search,get,create,update,delete,batch}` |
| Orders | `wc-orders-{search,get,create,update,delete}` |
| Reports | `wc-reports-{sales,orders-totals,products-totals,coupons-totals,…}` |
| Media | `media-upload-from-url` (product images — WordPress keeps its own copy) |

All run as the install's admin **inside the MCP session** — no consumer keys, no Basic Auth. This is
proven: a `wc-products-create` call makes a product that immediately appears on the public Store API.

---

## 2 — The storefront reads the public Store API

The **frontend** never touches the per-site MCP or any key. It reads the **public WooCommerce Store API**
at `site.json → urls.store_api` (`/cms/wp-json/wc/store/v1`) — public, open CORS, no auth for reads.
Pretty permalinks are on by default on a headless install, so the Store API resolves immediately.

| Store API call | Use |
|---|---|
| `GET /products?per_page=100` · `GET /products/<id>` · `?slug=<slug>` | catalog + product pages |
| `GET /products/categories` | category nav |
| `GET /cart` | current cart (seeds the `Cart-Token`) |
| `POST /cart/add-item` `{ id, quantity }` · `/cart/update-item` `{ key, quantity }` · `/cart/remove-item` `{ key }` | cart mutations |
| `POST /cart/apply-coupon` `{ code }` · `/cart/remove-coupon` `{ code }` | coupons on the cart |
| `POST /checkout` `{ billing_address, shipping_address, payment_method }` | place an order |

**Store API auth for writes** (cart/checkout): send the **`Nonce`** header (read it from the `Nonce` /
`X-WC-Store-API-Nonce` response header of a prior Store API GET and echo it back) **and** the
**`Cart-Token`** header (a JWT the Store API returns on the first cart response — resend it on every
cart call so a headless client keeps one cart; persist it in `localStorage`). Reads need neither.

**Pricing / minor units.** The Store API returns **integer-string** prices in minor units plus the
divisor: `prices.price` (e.g. `"1999"`) with `prices.currency_minor_unit` (e.g. `2`) and
`prices.currency_code`. Display value = `Number(price) / 10 ** currency_minor_unit`. **Pagination:**
`?page=&per_page=` (max 100), with `X-WP-Total` / `X-WP-TotalPages` headers.

---

## 3 — Seeding the catalog (content-model push)

Run after provision installed + activated WooCommerce (`site.json → woocommerce.enabled: true`), inside
the authenticated per-site WP MCP session (`SKILL.md` Step 1). Seed from the prepared catalog in
`content-model.md`. **Idempotent by SKU** (products) and **code** (coupons) — list/search first, create
only if absent, so a re-run never duplicates.

1. **Product categories** — for each category: `wc-product-categories-list` (match by `slug`/`name`,
   reuse the id) else `wc-product-categories-create { name, slug }`. Keep `name → id`.
2. **Products** — for each product: `wc-products-search { sku: "<sku>" }`; a hit → reuse its id; empty →
   `wc-products-create`:
   ```json
   { "name": "...", "type": "simple", "sku": "<unique>", "regular_price": "39.99",
     "description": "...", "short_description": "...", "status": "publish",
     "categories": [ { "id": <catId> } ] }
   ```
   - `regular_price` is a **decimal string in major units** (`"39.99"`) on the ability side — the Store
     API re-exposes it as minor units to the storefront.
   - **Variable products:** create the parent (`type: "variable"`) with its attributes, then the
     variations (via the product update / variations ability that discovery lists).
3. **Product images** — `media-upload-from-url { url, filename, alt_text, title }` (WordPress downloads
   and stores its own copy; raster, HTTPS, direct file URL — source like the parent `SKILL.md` Unsplash
   flow). Attach the returned media id to the product (`wc-products-update { id, images: [ { id } ] }`).
   Idempotency: skip when the product already has images.
4. **Coupons** — for each coupon: `wc-coupons-search { code }`; empty → `wc-coupons-create`:
   ```json
   { "code": "WELCOME10", "discount_type": "percent", "amount": "10" }
   ```
   (`discount_type`: `percent` | `fixed_cart` | `fixed_product`.)

Record the SKU → id map, category ids and coupon codes into `content-model.md` under
`## Created in WooCommerce` so the frontend and any re-run resolve references directly.

**Verify over the public Store API (no auth):**
- `GET {store_api}/products?per_page=100` → count matches the plan; each has `prices` (minor units +
  `currency_minor_unit`) and, where seeded, an image.
- `GET {store_api}/products/categories` → every planned category present.
- Coupon: `wc-coupons-search { code }` returns it, or apply it to a throwaway cart and see the total drop.

---

## 4 — Checkout is owner-completed (the one gate)

A fresh WooCommerce install has **no payment gateway and no shipping zone enabled**, and **neither is
reachable from the headless tooling** — there is no payment/shipping MCP ability, and `wp-settings-update`
only writes standard WordPress settings (it ignores `woocommerce_*` options). So:

- **The catalog, product pages, client-side cart and coupon application all work headlessly.**
- **Checkout (`POST /checkout`) does not work until the owner enables a payment method + a shipping zone
  in wp-admin** (WooCommerce → Settings → Payments / Shipping; reach it via the one-click login in Step 9).
  Cash on Delivery is the zero-config choice once enabled.
- Treat this exactly like the Hostinger Ecommerce `payment_enabled: false` gate: record
  `woocommerce.payment_enabled: false`, tell the user in one line that checkout needs that one setup step,
  and **never block the build on it**. The frontend renders a graceful disabled-checkout state and does not
  call `/checkout` while `payment_enabled` is `false`. Flip it to `true` only after the owner confirms a
  gateway is live. **Never ask the user for payment credentials.**

Store **currency** and **address** (`woocommerce_*` options) likewise aren't settable headlessly — they
follow the install default; the owner changes them in wp-admin if needed.

---

## 5 — REST API v3 (optional, owner-only — not used by this flow)

WooCommerce also exposes the authenticated **REST API v3** at `site.json → urls.wc_rest_api`
(`/cms/wp-json/wc/v3`) for external/server-side integrations. **This build never uses it** — seeding goes
through the per-site MCP and the storefront uses the public Store API. Document it for the owner only:

- **Auth:** `Authorization: Basic base64("<consumer_key>:<consumer_secret>")`, **HTTPS only**, server-side
  only — **never ship a key to the browser.**
- **Keys:** the owner generates a key pair in **wp-admin → WooCommerce → Settings → Advanced → REST API**
  (the agent cannot mint one headlessly). Store it in the owner's own environment, not in `site.json` or
  the repo.
- **Endpoints** (same shapes as the abilities above): `GET/POST/PUT/DELETE /products`, `/products/<id>/variations`,
  `/products/categories`, `/coupons`, `/orders`. Idempotency via `?sku=` / `?code=`. Pagination via
  `?page=&per_page=` + `X-WP-Total`.

---

## 6 — Idempotency & verification checklist

- **Idempotency keys:** products → **SKU** (`wc-products-search { sku }`); coupons → **code**
  (`wc-coupons-search { code }`); categories → **slug/name**; images → skip when the product already has
  `images`.
- **Verify over the public Store API** (no auth) — products count + prices + categories, and a coupon via
  a cart apply. Record the id/SKU map into `content-model.md`.
- **Checkout** is verified only when `payment_enabled` is `true`; while `false`, confirming the catalog +
  cart over the Store API is the whole job.
