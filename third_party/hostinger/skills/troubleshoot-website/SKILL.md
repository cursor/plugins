---
name: troubleshoot-website
description: "Diagnose and fix a website on Hostinger web hosting (Shared, Cloud or Agency plans) that is down, slow, erroring, insecure or failing to build. Checks the site from outside, reads builds, runtime logs, WordPress health, SSL, cache and PHP settings through the Hostinger MCP, names the cause with evidence, and applies the fix once the user agrees. Triggers: my site is down, site not loading, 500 / 502 / 503 error, white screen, error establishing a database connection, site is slow, SSL or certificate warning, not secure, changes not showing, Node.js build failed, app keeps crashing."
---

# Troubleshoot a website

One website and one symptom in; a named cause, the evidence for it, and a fix out. Stay read-only until the cause is stated and the user agrees to the fix.

## Calling the operations

- Read the `inputSchema` that `search` returns before the first call of each operation. If a name below is rejected as unknown, `search` for what the step does (e.g. "ssl status").
- Batch reads with `multi-execute` and pass values between steps with `$steps.<i>.<path>`, e.g. `"$steps.0.data.0.username"`. A batch stops at its first failure.
- The Hostinger Connector runs each product as its own MCP server (`hosting`, `wordpress`, `agency-hosting`, `domains`, `dns`), so a batch can only chain operations from one server. When `search` cannot find an operation, that product group is switched off in the Connector — ask the user to enable it.

## 1. Find the website

Run both lookups, and keep the result for every later call:

- `hosting_websites_list` with `domain` — Shared and Cloud plans. The filter is a substring match, so take the entry whose `domain` is exactly the one asked about. Keep `username`, `order_id` and `website_type`; every `hosting_*` and `wordpress_*` call is keyed on `username` + `domain`.
- `agency-hosting_websites_list-plan` with `domain` — Agency Plan. Keep `details.uid` (the `website_uid` of every `agency-hosting_*` call), `details.type`, `details.ipv4` and `details.domains`.

Neither finds it: the domain is not a website on this account — say so and show where it points (step 2).

## 2. Look at it from outside

Run these alongside step 1:

```bash
curl -sS -o /dev/null -w "%{http_code} ttfb=%{time_starttransfer}s %{redirect_url}\n" https://DOMAIN/
curl -sSI https://DOMAIN/
dig +short NS DOMAIN; dig +short A DOMAIN; dig +short CAA DOMAIN
```

- Hostinger responses carry `platform: hostinger` and `panel: hpanel`. Without them, or with DNS pointing elsewhere, traffic is not reaching this hosting — hand over to the `connect-domain` skill.
- Certificate or TLS errors → [SSL](#ssl).
- `5xx`, a blank page or an error page → [By website type](#3-by-website-type).
- `200` with old content → cache: `hosting_cache_clear-website` (also purges the Hostinger CDN; pass `directory` for WordPress in a subfolder), plus `wordpress_litespeed-cache_purge-lite-speed` for WordPress; Agency: `agency-hosting_cache_clear-website`.
- Slow first byte → [Slow site](#slow-site). Behind the Hostinger CDN, `x-hcdn-upstream-rt` is the origin's own response time in seconds; a small value there means the server is not the bottleneck.

## 3. By website type

`website_type` (Shared/Cloud) or `details.type` (Agency) picks the branch. `builder` and `horizons` sites are not managed by these operations — send the user to hPanel.

### Node.js (`nodejs`)

Batch `hosting_get-deployment` (the latest build with its log, failure analysis and stored settings), `hosting_nodejs_runtime-logs` (`period: "1h"`, `levels: ["ERROR", "WARN"]`) and `hosting_nodejs_list-environment-variables` (keys only; values always come back masked). On the hosted server, which has no `hosting_get-deployment`, use `hosting_nodejs_list-builds` (`per_page: 3`) in its place.

- Latest build `failed`: `hosting_get-deployment` already holds the `analysis` (fetched once per build — the API re-runs it on every call and allows 5 a minute). A wrongly detected framework, output directory or missing `entry_file` is the usual cause: compare the returned `buildSettings` with the project and deploy again with corrected `appType`, `outputDirectory`, `buildScript` or `entryFile`; a Git deploy stores them, so pushes build correctly too. On the hosted server: `hosting_nodejs_analyse-failed-build` once for that build, then `hosting_nodejs_build-logs`; compare `hosting_nodejs_build-settings`, rebuild through `hosting_nodejs_start-build` and store the values with `hosting_nodejs_update-build-settings`.
- Build `completed` but the app errors: read the runtime logs; entries older than `last_deployed_at` belong to the previous deploy. A variable the code reads but the key list lacks is fixed with the `deploy-to-hosting` skill's environment step. `Access denied for user '…'@'::1'` means the app connects to `localhost` — `DB_HOST` must be `127.0.0.1`.
- Hung process: `hosting_nodejs_restart-application` (restarts without rebuilding).

### WordPress (`wordpress`)

`wordpress_installations_list` with `username` and `domain` gives the install `id` — the `software` parameter of every `wordpress_*` call. Batch `wordpress_installations_check-if-are-valid` (`software_ids: [id]`, `force: true`), `wordpress_plugins_list-installed` and `wordpress_maintenance_show-status`.

- Invalid install: `validation_error` names the problem.
- Broken after a plugin or theme change: deactivate suspects one at a time with `wordpress_plugins_deactivate` (queued — allow a few seconds), re-run the step 2 check after each, and reactivate with `wordpress_plugins_activate` any that were not the cause.
- Maintenance page stuck: `wordpress_maintenance_toggle` with `enabled: false`.
- "Error establishing a database connection": `hosting_databases_list` with `domain`; corrupted tables are fixed by `hosting_databases_repair` (runs in the background). `wp-config.php` cannot be read through the API because files with secrets are refused — for credential checks hand the user `hosting_databases_phpmyadmin-link`.
- Memory or upload-size errors → [PHP](#php).

### Static or PHP (`other`)

- `403` or `404` at `/`: `hosting_files_list-website-and-directories` with `max_depth: 1`. `index.html` or `index.php` must sit at the document root; finding it one folder down means the archive was packed a level too deep — redeploy it flat with the `deploy-to-hosting` skill.
- Read `.htaccess` or other config with `hosting_files_website-content`.
- PHP errors → [PHP](#php).

### PHP

`hosting_php_get` returns every extension and option (around 25 KB), so call it only for PHP problems. `hosting_php_update-version` switches versions. `hosting_php_update-options` silently caps values at the plan maximum (`max` in `hosting_php_get`), so read the applied value back. Agency: `agency-hosting_php_list-options-for-website`, then `agency-hosting_php_replace-website-options` — a full replace, so send every custom option that should stay.

### Agency Plan sites

`agency-hosting_websites_get` shows state and quotas, `agency-hosting_websites_list-processes` shows failed jobs (SSL setup, backups), and `agency-hosting_wordpress_settings` shows core version, LiteSpeed, object cache and maintenance mode. When `wordpress_installations_list` does not return the site, plugins are managed from wp-admin.

## SSL

Shared and Cloud, `hosting_ssl_status`:

- `not_installed` or `failed` (`last_error` says why): the domain must resolve to Hostinger, and any CAA record must allow `letsencrypt.org`, before `hosting_ssl_install` can succeed. Poll the status until `active` or `failed`.
- `installing` or `waiting_for_retry`: wait — another install request returns 422.
- Free `*.hostingersite.com` subdomains use a platform certificate; installing returns 422 by design.
- Browser still warns while the certificate is `active`: turn on the redirect with `hosting_ssl_toggle-https-redirect` when `is_https_redirect_enabled` is false, otherwise the page loads `http://` assets (mixed content) that the app has to change.

Agency, `agency-hosting_ssl_website-status` for each domain: every domain allows three certificate setups per seven days and one request a minute. Check `agency-hosting_websites_list-processes` before `agency-hosting_ssl_install-website` or `agency-hosting_ssl_reinstall-website`, and never retry in a loop.

## Slow site

- WordPress: `wordpress_litespeed-cache_show-lite-speed-status` and `wordpress_object-cache_show-memcached-status`. Turning on Memcached with `wordpress_object-cache_toggle-memcached` is the usual quick win.
- Other sites: server caching may be off or development mode left on, and neither has a read operation. `hosting_cache_toggle-website` with `enabled: true` does nothing when caching is already on; `hosting_cache_toggle-cacheless` with `enabled: false` turns development mode off.
- PHP 7.x runs markedly slower than 8.x; propose a supported 8.x version from `hosting_php_get` when the app allows it.
- Agency: `agency-hosting_metrics_list-order-resource-usage` with `time_frame_hours: 24` shows CPU, memory and processes per website against the plan quota.
- Shared and Cloud have no CPU or memory metrics in the API. When the evidence points at resource limits, send the user to hPanel's resource usage page.

## Apply the fix

State the cause, the evidence and the single change proposed, and make it only after the user agrees. Then re-run the step 2 check, polling any queued job first, to show the symptom is gone. When the fix needs something the API cannot do, say so and name the hPanel page.

## Not available through the API

- Website backups and restores — hPanel's Backups page.
- CPU, memory and process usage for Shared and Cloud plans.
- PHP error and access logs.
