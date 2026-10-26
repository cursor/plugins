---
name: maintain-wordpress
description: "Keep WordPress sites on Hostinger web hosting updated and secure: checks core, plugin and theme versions, known vulnerabilities and install health on one site or every site in the account, reports what needs doing, applies updates in a safe order, and confirms each site still loads. Also covers cache purges, the Memcached object cache, maintenance mode and one-click wp-admin login links. Triggers: update my WordPress, update plugins, are my WordPress sites secure, WordPress vulnerabilities, outdated plugins or themes, WordPress maintenance, speed up WordPress, log me into wp-admin."
---

# Maintain WordPress

Check first, report, then update only what the user approves — one site at a time, proving each still loads before moving to the next.

## Calling the operations

- Read the `inputSchema` that `search` returns before the first call of each operation. If a name below is rejected as unknown, `search` for what the step does (e.g. "wordpress plugins update").
- Batch reads with `multi-execute` (up to 20 steps a batch). Batches chain operations from one server only — the Hostinger Connector runs `wordpress`, `hosting` and `agency-hosting` as separate servers.
- Updates, activations, uninstalls and core changes are queued jobs: a success response means "queued". Poll the matching read operation every 10–20 s until the change shows; never re-send the write.

## 1. Find the installs

- One site: `wordpress_installations_list` with `domain` (substring match — take the exact entry). Every site: `wordpress_installations_list` without filters, adding `ownership: "all"` to include sites the user manages for others.
- Keep `id` (the `software` parameter of every `wordpress_*` call), `username`, `domain`, `directory`, `is_valid` and `validation_error`.
- Agency Plan WordPress sites come from `agency-hosting_websites_list-plan` with `website_types: ["wordpress"]`. When `wordpress_installations_list` does not include them, only `agency-hosting_wordpress_settings` and core version changes (`agency-hosting_wordpress_list-versions`, `agency-hosting_wordpress_change-version`) are available; plugins and themes are updated from wp-admin.

## 2. Check (read-only)

Per install:

- `wordpress_installations_show-core-version` — core version and the known vulnerabilities that affect it.
- `wordpress_installations_list-core-updates` — available core versions.
- `wordpress_plugins_list-installed` — `status`, `update` (the newer version, when there is one) and `vulnerabilities[]` with `fixed_in`.
- `wordpress_themes_list-installed` — the same for themes.

Four steps per install fit five installs in one batch. For an install with `is_valid: false`, run `wordpress_installations_check-if-are-valid` with `force: true` for a fresh reason and leave it out of updates — a broken install is the `troubleshoot-website` skill's job.

## 3. Report before changing anything

```
## example.com (WordPress 6.8.1)
Vulnerable: contact-form-x 5.2 → fixed in 5.3 (update available)
Vulnerable, inactive: old-slider 1.0 — no fix; uninstall recommended
Updates: core 6.8.1 → 6.8.3 (minor), 4 plugins, 1 theme
```

Vulnerable items come first. A vulnerable plugin without a fix, or an inactive one, is better removed with `wordpress_plugins_uninstall` than left installed — inactive code on disk can still be reached. Ask which updates to apply.

## 4. Back up first

The API has no backup operation. Before updating, ask the user to create a backup in hPanel or confirm the latest automatic one is recent enough. Say it plainly; the user may choose to go ahead without one.

## 5. Update, one site at a time

1. Plugins that fix a vulnerability — `wordpress_plugins_update` with their slugs.
2. The remaining approved plugins, then themes with `wordpress_themes_update`.
3. Core with `wordpress_installations_update-core`: `minor: true` for patch releases; a major `version` only when the user asks for it.

For a busy site the user may want `wordpress_maintenance_toggle` with `enabled: true` during the run — and it is always turned off again afterwards, even when something failed.

After each site:

1. `wordpress_litespeed-cache_purge-lite-speed`.
2. `curl -s -o /dev/null -w "%{http_code}\n" https://DOMAIN/` and the same for `https://DOMAIN/wp-login.php` — both should be `200` with no PHP error in the body.
3. `wordpress_installations_check-if-are-valid` with `force: true`.

When a site breaks: stop the run, deactivate the plugin updated last with `wordpress_plugins_deactivate`, check again, and report which update caused it before touching any other site.

## 6. Performance and access

- Page cache: `wordpress_litespeed-cache_show-lite-speed-status`; purge after design or content changes.
- Object cache: `wordpress_object-cache_show-memcached-status`, then `wordpress_object-cache_toggle-memcached` with `enabled: true` — the usual quick speed-up.
- PHP version: `hosting_php_get` is large (around 25 KB), so read it only when the user asks about PHP. PHP 8.x is markedly faster than 7.x; confirm plugin compatibility before `hosting_php_update-version`.
- wp-admin: `wordpress_login_create-links` returns temporary one-click login links. Give them to the user only; never store or reuse them.
- Hostinger's own plugins update with `wordpress_plugins_update-hostinger` (`slug`).

## Many sites

Tell the user how many installs there are before starting. Check in batches, keep one running report, and update site by site so a failure stops the run with the rest untouched.
