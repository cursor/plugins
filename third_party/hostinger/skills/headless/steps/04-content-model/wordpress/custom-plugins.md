# headless — WordPress custom plugins cookbook (structure the backend in code)

A companion recipe to `SKILL.md` (WordPress content model). Use it when the content model needs **more
than posts, pages, categories and media** — when the brief calls for **structured content types**,
**global site settings the frontend reads**, or small **site-specific helpers**. Those cannot be created
through the per-site WP MCP (it has no endpoint to register a post type, a taxonomy, or an options page);
they need PHP, which means a **small custom plugin** deployed into the headless `/cms`.

**When to reach for this (and when not to).** The per-site WP MCP already covers content *data* through
dedicated abilities — `posts-*`, `pages-*`, `categories-*`, `tags-*`, `media-*`, `menus-*`, and `cpt-*` for
custom post types — but there is **no generic `wp/v2` passthrough** (no `RestEndpointTool`). A plugin is for
*structure and behaviour* that data sits in, and for anything those abilities can't reach:

| Need | Plugin? | Do it with |
|---|---|---|
| Blog posts, static pages, categories, media, nav | **no** | per-site WP MCP (`SKILL.md` Step 4) |
| A **custom post type** — Team, Services, Properties, Testimonials, a restaurant's dishes | **yes** | *Custom post type* below |
| A **custom taxonomy** — Property Type, Cuisine, Service Area | **yes** | *Custom taxonomy* below |
| **Global site content** the frontend needs — footer text, phone, address, opening hours, social links, a CTA line | **yes** | *Settings page + public settings route* below |
| Extra **fields on a post/CPT** exposed in REST (price, subtitle, map coords) | **yes** | *Custom fields in REST* below |
| A small **helper** — a shortcode, a computed REST value, a cron tidy-up | **yes** | *Helpers* below |
| Payment, membership, page-builder, SEO, caching, or anything a maintained plugin already does well | **no** | install the real plugin at provision — don't reinvent it |

> **Plugins carry structure, not catalog or content data.** You deploy a plugin you've written into the
> headless `/cms` with `hosting_deploy { type: "wordpress-plugin", headless: true }` (see *Deploy* below).
> Author one only for the *structure and behaviour* the per-site MCP can't express — types, taxonomies,
> settings, helpers. Don't write a **seed/config plugin** to load WooCommerce catalog data or page content;
> that goes through the per-site MCP's native abilities (`woocommerce.md`, `SKILL.md` Step 4), never a plugin.

---

## 1 — The one rule: everything the frontend needs must be in the public REST API

The Step 6 frontend is a separate app that reads the backend over the **public `wp/v2` REST API** (open
CORS on a headless install, no auth for reads). So a custom post type the frontend never sees in REST is
useless to it. **Register everything headless-visible with REST on:**

- **Post types** → `'show_in_rest' => true` and an explicit `'rest_base'` → the frontend reads
  `GET {urls.rest_api}/<rest_base>`.
- **Taxonomies** → `'show_in_rest' => true` and an explicit `'rest_base'` → readable, and embeddable on
  their objects with `?_embed`.
- **Meta fields** → `register_post_meta(..., [ 'show_in_rest' => true ])`, or `register_rest_field` for a
  computed value → appears under the object's `meta` (or your field) in REST.
- **Global settings** → a **public read-only REST route** the frontend fetches once for footer/contact/etc.

This is the whole reason the plugin exists in a headless build: it is a **schema + settings layer the
frontend consumes**, not an admin experience. Everything below keeps `show_in_rest` front and centre.

> **Register on the right hooks.** Post types and taxonomies register on `init`; meta on `init`; REST routes
> on `rest_api_init`; settings/admin pages on `admin_init` / `admin_menu`. Registering a post type outside
> `init` silently misbehaves.

---

## 2 — Plugin anatomy and WordPress standards

Keep it a **single, small, self-contained plugin per site** — one folder, prefixed, headless-focused. Ship
it as a directory (not a zip); the deploy tool uploads the folder's files and installs from them.

```
<site>-headless/                 slug = folder name = plugin slug, e.g. "acme-headless"
├── <site>-headless.php          main file with the plugin header (same base name as the folder)
├── inc/
│   ├── post-types.php
│   ├── taxonomies.php
│   ├── settings.php
│   └── rest.php
├── uninstall.php                optional — clean up options on delete
└── readme.txt                   optional
```

**Main file** — header, the `ABSPATH` guard, a constant for the version, and the activation flush:

```php
<?php
/**
 * Plugin Name:       Acme Headless
 * Description:        Content types, taxonomies and site settings for the Acme headless frontend.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Acme
 * License:           GPL-2.0-or-later
 * Text Domain:       acme-headless
 */

// No direct access — every PHP file in the plugin starts with this.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ACME_HEADLESS_VERSION', '1.0.0' );

require_once __DIR__ . '/inc/post-types.php';
require_once __DIR__ . '/inc/taxonomies.php';
require_once __DIR__ . '/inc/settings.php';
require_once __DIR__ . '/inc/rest.php';

// Post types/taxonomies are registered on `init` by the files above. Rewrite rules for their
// permalinks must be flushed once, on activation only (never on every load — it is expensive).
register_activation_hook( __FILE__, function () {
	acme_headless_register_post_types();
	acme_headless_register_taxonomies();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
```

**Standards that matter (every snippet below follows them):**

- **Prefix everything** — functions, options, the text domain, the REST namespace — with a per-site token
  (`acme_headless_`, `acme-headless`). Two plugins must never collide.
- **Guard every file** with `if ( ! defined( 'ABSPATH' ) ) { exit; }`.
- **Sanitize on input, escape on output.** `sanitize_text_field`, `sanitize_textarea_field`, `esc_url_raw`,
  `absint` on the way in; `esc_html`, `esc_attr`, `esc_url`, `wp_kses_post` on the way out.
- **Check capability + nonce** on any admin write (`current_user_can( 'manage_options' )`; the Settings API
  handles the nonce for you). Set `permission_callback` on every REST route — `__return_true` only for
  genuinely public reads, a capability check for anything that writes.
- **Never hardcode a secret** in the plugin, and never expose one over a public route. Site settings the
  frontend reads are public content (footer text, phone) — API keys and the like are not; keep those out.
- **i18n:** wrap user-facing strings in `__( 'text', 'acme-headless' )`. Headless admin labels are low-stakes
  but costs nothing to do right.

> **Flushing rewrite rules headlessly.** The activation hook above runs when the plugin is activated, so CPT
> *permalinks* resolve. But the frontend reads **REST**, and REST routes work the moment the type is
> registered — they don't depend on a rewrite flush. So even if activation timing is odd, `GET /<rest_base>`
> is live as soon as the plugin is active. Don't block the build on permalink flushing.

---

## 3 — Custom post type

One `register_post_type` per type, on `init`, with REST on and an explicit `rest_base`:

```php
// inc/post-types.php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function acme_headless_register_post_types() {
	register_post_type( 'acme_service', array(
		'labels'        => array(
			'name'          => __( 'Services', 'acme-headless' ),
			'singular_name' => __( 'Service', 'acme-headless' ),
		),
		'public'        => true,
		'has_archive'   => true,
		'menu_icon'     => 'dashicons-hammer',
		'supports'      => array( 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields' ),
		'show_in_rest'  => true,              // REQUIRED for the headless frontend
		'rest_base'     => 'services',        // GET {rest_api}/services
		'rewrite'       => array( 'slug' => 'services' ),
	) );
}
add_action( 'init', 'acme_headless_register_post_types' );
```

- Pick a **prefixed internal key** (`acme_service`, ≤ 20 chars) but a **clean `rest_base`** (`services`) —
  the frontend route reads naturally and won't clash with core.
- `'supports' => [ 'thumbnail' ]` enables the featured image; `'custom-fields'` lets meta ride along.
- After deploy, the per-site WP MCP can **populate entries** into this type with its **native
  `cpt-*` abilities** — `cpt-list-types` (confirm the type is registered, with its `rest_base`),
  then `cpt-create { post_type: "acme_service", title, content, excerpt?, status: "publish" }`
  (and `cpt-search` / `cpt-get` / `cpt-update` / `cpt-delete`). Deploy the plugin first (the schema),
  then seed entries through the MCP. Note `cpt-create` takes **no taxonomy/term fields** — see §4 for how
  custom-taxonomy terms are handled.

## 4 — Custom taxonomy

```php
// inc/taxonomies.php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function acme_headless_register_taxonomies() {
	register_taxonomy( 'acme_service_area', array( 'acme_service' ), array(
		'labels'            => array(
			'name'          => __( 'Service Areas', 'acme-headless' ),
			'singular_name' => __( 'Service Area', 'acme-headless' ),
		),
		'public'            => true,
		'hierarchical'      => true,          // true = categories, false = tags
		'show_in_rest'      => true,          // REQUIRED for the frontend
		'rest_base'         => 'service-areas',
		'rewrite'           => array( 'slug' => 'service-areas' ),
	) );
}
add_action( 'init', 'acme_headless_register_taxonomies' );
```

**Seeding terms is a PHP job, not an MCP one.** The per-site MCP has no custom-taxonomy ability
(`categories-*` / `tags-*` cover only the built-in `category` / `post_tag`, and there is no generic REST
passthrough), and `cpt-create` takes no term fields. So seed the taxonomy's starter terms **in the plugin**,
on `init`, **gated by a version option** — not the activation hook, which doesn't re-run when you redeploy
an already-active plugin, so later-added terms would never seed. Bump `ACME_HEADLESS_VERSION` and redeploy
to re-run the seed:

```php
add_action( 'init', function () {
	if ( get_option( 'acme_headless_seed_version' ) === ACME_HEADLESS_VERSION ) {
		return;                                             // already seeded for this version
	}
	foreach ( array( 'Downtown', 'Suburbs', 'Coast' ) as $area ) {
		if ( ! term_exists( $area, 'acme_service_area' ) ) {
			wp_insert_term( $area, 'acme_service_area' );   // idempotent via the term_exists guard
		}
	}
	update_option( 'acme_headless_seed_version', ACME_HEADLESS_VERSION );
}, 11 );                                                    // after register_taxonomy (init, priority 10)
```

Terms then read over REST (`GET {rest_api}/service-areas`) and embed on their objects with
`GET {rest_api}/services?_embed`. **Pre-assigning a term to an entry is separate** — `cpt-create` can't set
terms. Either the owner assigns them in wp-admin, or the same versioned seed attaches them **by entry slug
once the entries exist** (`wp_set_object_terms( get_page_by_path( '<slug>', OBJECT, 'acme_service' )->ID,
'<term>', 'acme_service_area' )`) — seed the entries first, then bump `ACME_HEADLESS_VERSION` and redeploy
so the seed re-runs with the entries in place.

## 5 — Settings page + a public settings route (footer, phone, generic text)

The classic headless need: **one place the owner edits global content** (footer blurb, phone, email,
address, opening hours, social links, a CTA line) and **one REST route the frontend fetches** to render it
site-wide. Store it as a **single option holding an array**, edited with the Settings API, and exposed
read-only over REST.

```php
// inc/settings.php
if ( ! defined( 'ABSPATH' ) ) { exit; }

const ACME_HEADLESS_OPTION = 'acme_headless_settings';

// --- Admin page (wp-admin → Settings → Acme Headless): where the owner edits global content. ---
add_action( 'admin_menu', function () {
	add_options_page(
		__( 'Acme Headless', 'acme-headless' ),
		__( 'Acme Headless', 'acme-headless' ),
		'manage_options',                      // capability check
		'acme-headless',
		'acme_headless_settings_page'
	);
} );

add_action( 'admin_init', function () {
	// register_setting wires in the nonce + capability check and runs our sanitizer on save.
	register_setting( 'acme_headless', ACME_HEADLESS_OPTION, array(
		'type'              => 'object',
		'sanitize_callback' => 'acme_headless_sanitize_settings',
		'default'           => array(),
	) );
} );

// Sanitize on input — never trust the posted array.
function acme_headless_sanitize_settings( $input ) {
	return array(
		'phone'       => sanitize_text_field( $input['phone'] ?? '' ),
		'email'       => sanitize_email( $input['email'] ?? '' ),
		'address'     => sanitize_textarea_field( $input['address'] ?? '' ),
		'footer_text' => sanitize_textarea_field( $input['footer_text'] ?? '' ),
		'facebook'    => esc_url_raw( $input['facebook'] ?? '' ),
		'instagram'   => esc_url_raw( $input['instagram'] ?? '' ),
	);
}

function acme_headless_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$o = get_option( ACME_HEADLESS_OPTION, array() );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Acme Headless', 'acme-headless' ); ?></h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'acme_headless' ); // nonce + option group ?>
			<table class="form-table" role="presentation">
				<tr>
					<th><label for="ah_phone"><?php esc_html_e( 'Phone', 'acme-headless' ); ?></label></th>
					<td><input name="<?php echo esc_attr( ACME_HEADLESS_OPTION ); ?>[phone]" id="ah_phone"
						type="text" value="<?php echo esc_attr( $o['phone'] ?? '' ); ?>" class="regular-text"></td>
				</tr>
				<tr>
					<th><label for="ah_footer"><?php esc_html_e( 'Footer text', 'acme-headless' ); ?></label></th>
					<td><textarea name="<?php echo esc_attr( ACME_HEADLESS_OPTION ); ?>[footer_text]" id="ah_footer"
						rows="3" class="large-text"><?php echo esc_textarea( $o['footer_text'] ?? '' ); ?></textarea></td>
				</tr>
				<!-- email, address, social … same pattern -->
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
```

Now expose it to the frontend as a **public, read-only** route. This is global site chrome — public content
by definition — so the read is open. The values were **sanitized on save** (the Settings API sanitizer
above), so return them as **plain JSON** — the frontend escapes on render — and never add a secret to it.
Don't HTML-escape here: `esc_html()`/`esc_url()` in a JSON response double-encode `&`:

```php
// inc/rest.php
if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
	register_rest_route( 'acme/v1', '/settings', array(
		'methods'             => WP_REST_Server::READABLE,     // GET
		'permission_callback' => '__return_true',              // public read — global chrome only
		'callback'            => function () {
			$o = get_option( ACME_HEADLESS_OPTION, array() );
			return array(
				// Already sanitized on save (see the Settings API sanitizer above); return as plain
				// JSON strings — the frontend escapes on render. Don't esc_html()/esc_url() here, or
				// a JSON client double-encodes "&" (e.g. "Tea & Co" → "Tea &amp; Co").
				'phone'       => $o['phone'] ?? '',
				'email'       => sanitize_email( $o['email'] ?? '' ),
				'address'     => $o['address'] ?? '',
				'footer_text' => wp_kses_post( $o['footer_text'] ?? '' ),
				'social'      => array(
					'facebook'  => esc_url_raw( $o['facebook'] ?? '' ),
					'instagram' => esc_url_raw( $o['instagram'] ?? '' ),
				),
			);
		},
	) );
} );
```

The frontend fetches `GET {urls.cms}/wp-json/acme/v1/settings` once (it's cacheable) and renders the
footer, header contact bar, etc. Record this route in `content-model.md` so Step 6 wires it in.

> **Custom namespace base vs `urls.rest_api`.** `site.json → urls.rest_api` points at the `…/wp-json/wp/v2`
> base (core content). A custom namespace lives one level up, off `{urls.cms}/wp-json` — e.g.
> `{urls.cms}/wp-json/acme/v1/settings`. Record the full custom URL explicitly so the frontend doesn't try
> to hang it off the `wp/v2` base.

## 6 — Custom fields in REST (meta on a post or CPT)

For a simple stored field, `register_post_meta` with `show_in_rest` — it then reads/writes under the
object's `meta`:

```php
add_action( 'init', function () {
	register_post_meta( 'acme_service', 'price_from', array(
		'type'          => 'string',
		'single'        => true,
		'show_in_rest'  => true,                                // appears in REST under meta.price_from
		'auth_callback' => function () { return current_user_can( 'edit_posts' ); },
		'sanitize_callback' => 'sanitize_text_field',
	) );
} );
```

For a **computed/read-only** value (not stored, derived at response time), use `register_rest_field`:

```php
add_action( 'rest_api_init', function () {
	register_rest_field( 'acme_service', 'read_time', array(
		'get_callback' => function ( $post ) {
			return max( 1, (int) ceil( str_word_count( wp_strip_all_tags( get_post( $post['id'] )->post_content ) ) / 200 ) );
		},
		'schema' => array( 'type' => 'integer' ),
	) );
} );
```

## 7 — Helpers (shortcodes, computed values, small cron)

Keep helpers tiny and single-purpose, in `inc/`. A headless frontend rarely renders WordPress HTML, so
prefer a **REST value over a shortcode**. If a cron job is genuinely needed, schedule it on activation and
clear it on deactivation (don't leave orphaned events):

```php
register_activation_hook( __FILE__, function () {
	if ( ! wp_next_scheduled( 'acme_headless_daily' ) ) {
		wp_schedule_event( time(), 'daily', 'acme_headless_daily' );
	}
} );
register_deactivation_hook( __FILE__, function () {
	wp_clear_scheduled_hook( 'acme_headless_daily' );
} );
add_action( 'acme_headless_daily', 'acme_headless_run_daily' );
```

> **The two `register_*_hook` lines must sit in the main `<site>-headless.php` file** (beside the plugin's
> existing activation hook), not in an `inc/` include: `__FILE__` has to resolve to the **main plugin file**
> or the hooks never fire. The schedule check and the callback (`add_action( 'acme_headless_daily', … )` and
> `acme_headless_run_daily()`) can live in `inc/`.

Clean up on uninstall so deleting the plugin leaves no rows behind:

```php
// uninstall.php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) { exit; }
delete_option( 'acme_headless_settings' );
```

---

## 8 — Deploy the plugin into the headless `/cms`

Deploy the **plugin directory** with the connector's one-shot `hosting_deploy`, passing **`headless: true`**
so it lands in `cms/wp-content/plugins/` (not the document-root `wp-content/`):

```json
{ "operation": "hosting_deploy",
  "params": {
    "domain": "<domain>",
    "type": "wordpress-plugin",
    "path": "~/.hostinger/<domain>/plugins/<site>-headless",
    "slug": "<site>-headless",
    "headless": true } }
```

- **`path`** is the plugin **folder** (it contains the main `*.php` with the plugin header). The tool scans
  the directory and uploads every file; it skips `node_modules`, `.git`, OS junk and `.env*` on its own —
  don't zip it yourself, don't pass a git repo (`headless` is path-only).
- **`slug`** becomes the install directory name (lower-case letters, digits, `-`, `_`). Keep it the same
  across re-runs; the tool appends a random suffix to the *upload* dir, then installs from it.
- `type` is optional — the tool detects a WordPress plugin from the header — but pass it to be explicit.
- A plugin/theme deploy is **done when the call returns** (unlike a Node.js build). The result echoes
  `{ type: "wordpress-plugin", status: "deployed", slug, headless: true }`.
- It **overwrites** a previous deploy of the same plugin — re-run freely to ship a fix. Confirm the domain
  first, as with any deploy.

**The deploy activates the plugin for you — then verify over public REST:**

1. **Confirm it's active** (the headless plugin deploy activates it on install — you normally don't
   call activate yourself). Check the per-site MCP's `plugin-list` ability for your slug, or just
   rely on the REST check below. Only if it comes back inactive, activate it with
   `wordpress_plugins_activate { username, software, plugin: "<slug>/<slug>.php" }` (or the bare
   `"<slug>"` form) and re-check.
2. **Verify the REST surface is live** (public GET, no auth) — this is the real proof the plugin is
   active and registered:
   - CPT: `GET {urls.rest_api}/services` returns `200` (empty array before you seed entries — that's fine).
   - Taxonomy: `GET {urls.rest_api}/service-areas` returns `200`.
   - Settings: `GET {urls.cms}/wp-json/acme/v1/settings` returns your JSON shape.
   - Namespace: `GET {urls.cms}/wp-json/` lists your `acme/v1` under `namespaces`.
   A `404` on a route means the plugin isn't active (or the `rest_base`/namespace differs) — fix before moving on.

> **Order matters.** Deploy the plugin **before** the content push seeds entries into the new types — the
> type must exist in REST for the MCP's `cpt-create` to accept entries. Default **Settings** values are
> seeded by the plugin itself (in the same versioned `init` seed, via `update_option`) or left for the owner
> to fill in wp-admin — record which in `content-model.md`. The MCP can't write the custom option
> (`wp-settings-update` only touches standard WordPress settings, and there's no generic REST passthrough).

---

## 9 — Record and hand off

Write what you built into `content-model.md` under a `## Custom plugin` section so Step 6 (frontend data)
and any re-run resolve it without re-discovery:

- Plugin **slug** and version, and that it's deployed + active.
- Each **post type**: internal key → `rest_base` → the full read URL the frontend uses.
- Each **taxonomy**: key → `rest_base`, and which types it's attached to.
- Each **meta / REST field** exposed, and under what key it appears.
- The **settings route** full URL and its JSON shape (so the frontend knows the footer/contact fields).

The frontend then reads these routes exactly like core `wp/v2` content — same host, same open CORS, no auth.

---

## 10 — Checklist & further reading

- [ ] One prefixed plugin folder; main file carries the plugin header; every PHP file guards `ABSPATH`.
- [ ] Post types & taxonomies: `show_in_rest: true` + explicit `rest_base`, registered on `init`.
- [ ] Settings stored in one option, Settings API for the admin page (capability + nonce), **sanitized in**.
- [ ] Public settings **read** route with `permission_callback`, values returned as **plain JSON** (sanitized on save, not HTML-escaped), no secrets.
- [ ] Rewrite flush on activation; cron (if any) cleared on deactivation; `uninstall.php` tidies options.
- [ ] Deployed with `hosting_deploy { type: "wordpress-plugin", headless: true }`, confirmed **active**,
      every REST route returns `200`.
- [ ] Routes recorded in `content-model.md` for the frontend.

**References** — this cookbook is self-contained, but for depth follow the maintained sources (don't invent
APIs; confirm a function against these):

- WordPress **Plugin Handbook** — <https://developer.wordpress.org/plugins/> (headers, hooks, activation,
  Settings API, security: nonces/capabilities/sanitizing/escaping).
- WordPress **REST API Handbook** — <https://developer.wordpress.org/rest-api/> (`show_in_rest`,
  `register_rest_route`, `register_rest_field`, authentication).
- Post types & taxonomies — <https://developer.wordpress.org/reference/functions/register_post_type/> ·
  <https://developer.wordpress.org/reference/functions/register_taxonomy/>.
- **WordPress/agent-skills** (expert WordPress knowledge for AI assistants — blocks, themes, plugins, best
  practices) — <https://github.com/WordPress/agent-skills>. If your coding agent exposes WordPress skills
  (e.g. plugin-development, rest-api), prefer them for generating and reviewing the PHP; this cookbook is the
  headless wiring around them.
