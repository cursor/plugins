---
name: migrate-to-hosting
description: "Move an existing website from another host to Hostinger web hosting (Shared, Cloud or Agency plans) without downtime: WordPress sites from a files archive and SQL dump, static and PHP sites from an archive, Node.js apps from source. Creates the website on the real domain, imports files and database, tests the copy before any DNS change, then switches the domain and SSL. Triggers: migrate my site to Hostinger, move my website from another host, transfer my WordPress site, import my website, switch hosting to Hostinger."
---

# Migrate to hosting

The old host keeps serving the site until the copy on Hostinger is proven to work. DNS moves last.

## Calling the operations

- Read the `inputSchema` that `search` returns before the first call of each operation. If a name below is rejected as unknown, `search` for what the step does (e.g. "import wordpress").
- Batch reads with `multi-execute`. Batches chain operations from one server only — the Hostinger Connector runs `hosting`, `wordpress`, `agency-hosting`, `domains` and `dns` as separate servers.
- Imports and deploys overwrite the target website's contents; confirm the target before each one.

## 1. What is being moved

Establish, asking only for what cannot be inferred:

- **Site type:** WordPress, static, PHP (with or without MySQL), or Node.js.
- **The export:**
  - WordPress — an archive of the whole WordPress root (including `wp-content` and `wp-config.php`) and a `.sql` dump.
  - PHP — a files archive, plus a `.sql` dump when the app has a database.
  - Static — the files. Node.js — the source or its Git repository.
  - Without one, the user exports it from the old host's panel, or over SSH: `tar -czf site.tar.gz -C /path/to/site .` and `mysqldump --single-transaction -u USER -p DBNAME > db.sql`.
- **The exact home URL** (`https`, with or without `www`) — WordPress keeps it in the database, so the new site must answer on the same one.
- **Current DNS**, to preserve what already works:

```bash
dig +short NS DOMAIN; dig +short A DOMAIN; dig +short MX DOMAIN; dig +short TXT DOMAIN
```

- **Cron jobs** on the old host — they do not move with the files.

## 2. Create the website on the real domain

Create the Hostinger website on the domain being migrated, not on a free subdomain: step 4 tests it by pointing only this machine at Hostinger, so nothing changes for visitors yet.

- Shared and Cloud: `hosting_domains_verify-ownership` first. When `is_accessible` is false, the user adds the returned `TXT` record at their current DNS provider, next to the existing ones, and verification is repeated. Then `hosting_websites_create` with `domain` and `order_id` (from `hosting_orders_list`), and poll `hosting_websites_list-setups` with `domain` every 10–15 s until `status: completed`.
- Agency: `agency-hosting_website-setups_create` with the `domain`, `flavor: "php-fpm"`, a `settings.php.version` matching the old host (options in `agency-hosting_php_list-versions-for-order`) and `datacenter_code` from `agency-hosting_datacenters_list`. Poll `agency-hosting_website-setups_status` until `completed` for the `website_uid`.

## 3. Import

`hosting_deploy` and `agency-hosting_deploy-php-application` read files from this machine and exist only in the local `hostinger-api-mcp` server. On the hosted server (`mcp.hostinger.com`), upload the files first as described in the `deploy-to-hosting` skill ("Without the local deploy operations") and use the operation named in brackets below.

**WordPress, Shared and Cloud:** `hosting_deploy` with `domain`, `path` (the site directory or its archive), `databaseDump` and `type: "wordpress-site"` uploads both, extracts the files and imports the database; large sites take several minutes. Always pass `type`: left to detection, a directory without `wp-config.php` or `wp-content` at its top level is taken for a plain site and the dump is not imported. [Upload `site.zip` and `dump.sql`, then `wordpress_installations_import-website` with `archive_path` and `sql_path`.] Then `wordpress_installations_detect` with `username` and poll `wordpress_installations_list` with `domain` until the install appears with `is_valid: true`.

**Static, or PHP without a database:** `hosting_deploy` with `domain` and `path` [upload, then `hosting_websites_deploy-static-site-archive`]; Agency: `agency-hosting_deploy-php-application` [upload to `.h5g/`, then `agency-hosting_files_import-website-from-archive`].

**PHP with a database, Shared and Cloud:**

1. `hosting_databases_create` with a strong generated password; read the full name, user and `host` back from `hosting_databases_list`.
2. Import the dump from this machine: allow only its public IP (`curl -s https://api.ipify.org`) with `hosting_databases_create-remote-connection`, run `mysql -h HOST -u USER -p NAME < db.sql`, then remove the rule with `hosting_databases_delete-remote-connection`. Without a MySQL client, use `hosting_databases_phpmyadmin-link` and import there.
3. Put the new name, user and password into the app's config file, with host `localhost`, before archiving; then deploy as above. Never ship the `srvNNNN.hstgr.io` host inside the app.

**Node.js:** deploy with the `deploy-to-hosting` skill. When a dump must be imported, create the database with `hosting_databases_create` rather than `hosting_databases_setup-website` — the latter never reveals the password needed for the import — and pass the credentials through environment variables.

**Agency:** files with `agency-hosting_deploy-php-application` [or upload plus `agency-hosting_files_import-website-from-archive`]; the database with `agency-hosting_databases_create-website`, imported through phpMyAdmin in hPanel (no import operation exists). For WordPress, set the new credentials in `wp-config.php` before archiving.

## 4. Test before DNS moves

Find the server address: `details.ipv4` for Agency; for Shared and Cloud, the `A` record for `@` in the Hostinger zone (`dns_records_list` on the domain) or the IP hPanel shows for the website. Then point only this machine at it:

```bash
curl -sSk --resolve DOMAIN:443:IP -o /dev/null -w "%{http_code}\n" https://DOMAIN/
curl -sSk --resolve DOMAIN:443:IP https://DOMAIN/ | grep -o "TEXT FROM THE LIVE SITE"
curl -sSk --resolve DOMAIN:443:IP -o /dev/null -w "%{http_code}\n" https://DOMAIN/wp-login.php
```

`-k` is expected here: the certificate for the domain can only be issued after DNS moves. Check the home page, an inner page and, for WordPress, the login page. For a look in the browser, the user adds `IP DOMAIN www.DOMAIN` to their hosts file and removes it afterwards. Fix anything broken now, while visitors still see the old site.

## 5. Switch DNS and SSL

Follow the `connect-domain` skill from its DNS step: keep every `MX` and `TXT` record from step 1, then install SSL once the domain resolves to Hostinger. When the user controls the old DNS, lowering the TTL of the `A` records to 300 a day ahead shortens the switch.

## 6. After the switch

- Verify without `--resolve`: `curl -sSI https://DOMAIN/` shows `platform: hostinger`.
- Recreate the old host's cron jobs with `hosting_cron-jobs_create` (Agency: `agency-hosting_cron-jobs_create-website`).
- Keep the old hosting running for a few days — some resolvers still cache the old address, and email hosted there must be moved separately.
