---
name: connect-domain
description: "Connect a custom domain to a website on Hostinger web hosting (Shared, Cloud or Agency plans) end to end: attach the domain to the site, point DNS at Hostinger without breaking existing email or verification records, install SSL, turn on the HTTPS redirect, and verify it resolves. Handles domains registered at Hostinger or elsewhere, moving a site off its free *.hostingersite.com subdomain, subdomains and aliases. Triggers: connect my domain, point my domain to my site, use my own domain, move off the free subdomain, add a subdomain, park a domain, add a domain alias, my domain is not working."
---

# Connect a domain

Get a domain serving a Hostinger website over HTTPS. The one rule that matters most: records that already work — email (`MX`), SPF, DKIM and verification `TXT` records — must survive every DNS change.

## Calling the operations

- Read the `inputSchema` that `search` returns before the first call of each operation. If a name below is rejected as unknown, `search` for what the step does (e.g. "dns records").
- Batch reads with `multi-execute`; values pass between steps as `$steps.<i>.<path>`. Batches chain operations from one server only — the Hostinger Connector runs `hosting`, `agency-hosting`, `domains` and `dns` as separate servers. When `search` cannot find an operation, ask the user to enable that product group in the Connector.
- Every write here changes what the public sees. State the change and get a yes before each one.

## 1. Gather the facts (read-only)

- **Website.** `hosting_websites_list` with `domain` (Shared and Cloud; substring match, so take the exact entry) and `agency-hosting_websites_list-plan` with `domain` (Agency). Keep `username` and `order_id`, or `details.uid` and `details.ipv4`. When the domain has no website yet, find the site the user means — often a `*.hostingersite.com` one — or the order to create it on (`hosting_orders_list`, `agency-hosting_orders_list`).
- **Registration.** `domains_portfolio_get` succeeds only for domains registered at Hostinger; its `name_servers` show who runs DNS. Hostinger's own nameservers end in `dns-parking.com`.
- **Live DNS**, to know what must be kept:

```bash
dig +short NS DOMAIN; dig +short A DOMAIN; dig +short CNAME www.DOMAIN
dig +short MX DOMAIN; dig +short TXT DOMAIN; dig +short CAA DOMAIN
```

## 2. Attach the domain to hosting

Shared and Cloud:

- **New website on the domain.** For a domain outside this account run `hosting_domains_verify-ownership` first. When `is_accessible` is false, give the user the `TXT` record it returns to add next to the existing ones, then verify again (propagation takes up to ~10 minutes). Create with `hosting_websites_create` (`domain` without `www.`, `order_id`), then poll `hosting_websites_list-setups` with `domain` every 10–15 s until `status: completed`.
- **Moving a site off its free subdomain.** Shared and Cloud websites cannot be renamed through the API. Either create a website on the real domain and redeploy the project there (the `deploy-to-hosting` skill) — required for WordPress, which keeps its URL in the database — or, for static sites, park the domain on the existing site with `hosting_domains_create-website-parked`.
- **Alias** (a second domain showing the same site): `hosting_domains_create-website-parked`.
- **Subdomain** (`shop.example.com`): `hosting_domains_create-website-subdomain`. `www` belongs to the main domain — do not create it as a subdomain.

Agency Plan:

- `agency-hosting_domains_link-to-website` adds a domain to the site.
- `agency-hosting_domains_change-website` replaces the primary domain, for example the free subdomain. The old name stops serving at once — confirm first.

## 3. Point DNS at Hostinger

**DNS already at Hostinger** (nameservers end in `dns-parking.com`): creating the website normally writes the records. Read the zone with `dns_records_list`; when `@` and `www` already point at the site, change nothing. Before any edit, note the newest `dns_snapshots_list` entry — `dns_snapshots_restore` rolls back to it.

`dns_records_update` defaults to `overwrite: true`, which deletes every existing record with the same name and type. Adding a `TXT` at `@` that way wipes SPF and verification records. Send `overwrite: false` when adding; use `true` only to replace one record set on purpose, and run `dns_records_validate` on the same payload first.

**DNS elsewhere** (registered at Hostinger with other nameservers, or registered elsewhere). Two options — let the user choose:

- **Switch nameservers to Hostinger.** Hostinger then manages every record. First copy each record the current DNS serves beyond the website — `MX`, `TXT`, service `CNAME`s — into the Hostinger zone with `dns_records_update` (`overwrite: false`); otherwise email breaks when the nameservers flip. Hostinger's nameserver pairs differ between domains (`ns1`/`ns2.dns-parking.com`, `solar`/`lunar.dns-parking.com` and others), so use the pair hPanel shows for this domain, never a guessed one. For Hostinger-registered domains apply it with `domains_portfolio_update-nameservers`; otherwise the user changes it at their registrar.
- **Keep the current DNS provider** and change only the web records: `A` for `@` and `CNAME` (or `A`) for `www`. Agency sites point at `details.ipv4`. Shared and Cloud sites point at the targets in the Hostinger zone for the domain (`dns_records_list`) or, when that zone does not exist, the IP hPanel shows for the website. The user makes this change at their DNS provider.

## 4. SSL and HTTPS

Start only once `dig` shows the domain resolving to Hostinger — the certificate authority checks the domain against the server.

- Shared and Cloud: `hosting_ssl_status`. When it is not `active`, call `hosting_ssl_install` and poll the status until `active` (or `failed` with `last_error`), then `hosting_ssl_toggle-https-redirect` with `is_enabled: true` (it returns 422 until a certificate exists).
- Agency: `agency-hosting_ssl_install-website` for each domain, then poll `agency-hosting_ssl_website-status`. A domain allows three setups per seven days and one request a minute — install once DNS is right and never loop.
- A `CAA` record at the apex that does not allow `letsencrypt.org` blocks issuance; the user adds `0 issue "letsencrypt.org"` beside the existing ones.

## 5. Verify

```bash
dig +short A DOMAIN; dig +short A www.DOMAIN
curl -sSI https://DOMAIN/ | grep -i -E "^(HTTP|platform|location)"
curl -sSI http://DOMAIN/ | grep -i -E "^(HTTP|location)"
dig +short MX DOMAIN
```

Done when both names resolve to Hostinger, HTTPS answers with `platform: hostinger`, HTTP redirects to HTTPS, and `MX` still matches step 1. Nameserver changes can take up to 24–48 hours to reach every resolver; when records are still old, report what is pending and the command to re-check instead of polling for hours.
