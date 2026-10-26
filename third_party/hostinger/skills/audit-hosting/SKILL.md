---
name: audit-hosting
description: "Audit a Hostinger web hosting account (Shared, Cloud and Agency plans) and report what needs attention: every plan and website, SSL problems, broken or vulnerable WordPress installs, failed Node.js builds and vulnerable npm packages, databases and Agency Plan orders near their limits, and hosting plans about to lapse. Read-only; produces a prioritised to-do list and names the skill that fixes each item. Triggers: what do I have on Hostinger, audit my hosting, check all my websites, what needs attention, health check my sites, are any of my sites broken, which of my sites are insecure."
---

# Audit hosting

Read-only from start to finish. The output is a report; every fix is a separate, confirmed step through another skill.

## Calling the operations

- Read the `inputSchema` that `search` returns before the first call of each operation. If a name below is rejected as unknown, `search` for what the step does (e.g. "ssl status").
- Batch reads with `multi-execute`, up to 20 steps a batch. Batches chain operations from one server only — the Hostinger Connector runs `hosting`, `wordpress`, `agency-hosting` and `billing` as separate servers. When a product group is switched off, skip its checks and say which were skipped.
- Page every list until `meta.total` is covered.
- Leave `hosting_php_get` out — it is large and says nothing about account health.

## 1. Inventory

One batch per server:

- `hosting_orders_list` with `statuses: ["active", "suspended"]`. `cloud_*` plan names are Cloud; the rest (`hostinger_premium_*`, `hostinger_business_*`, …) are Shared.
- `hosting_websites_list` — every Shared and Cloud website with `website_type`, `username`, `order_id` and `is_enabled` (false means suspended).
- `wordpress_installations_list` with `ownership: "all"` — `id`, `is_valid`, `validation_error`.
- `agency-hosting_orders_list` and `agency-hosting_websites_list-plan` — Agency orders and sites (`details.uid`, `details.type`, `details.domains`, `details.state`).

Tell the user the size (plans, websites, WordPress installs) before the checks. For large accounts offer to scope the audit to one order or domain.

## 2. Checks

Per Shared and Cloud website (skip `builder` and `horizons`):

- `hosting_ssl_status` — flag `failed` (with `last_error`), `expired`, `not_installed` on a custom domain, `is_https_redirect_enabled: false`, and `expires_at` within 30 days when `is_lifetime` is false. Lifetime certificates renew on their own.
- Node.js sites: `hosting_get-deployment` (latest build failed? `build.state`; on the hosted server use `hosting_nodejs_list-builds` with `per_page: 1`) and `hosting_nodejs_list-vulnerabilities` with `severities: ["critical", "high"]`.

Per hosting account (`username`): `hosting_databases_list` — flag `disk_usage_mb` above 80% of `max_size_mb`.

Per WordPress install: `wordpress_installations_show-core-version` (core vulnerabilities) and `wordpress_plugins_list-installed` (vulnerable plugins and pending updates).

Per Agency order: `agency-hosting_metrics_list-order-resource-usage` with `time_frame_hours: 168` and `agency-hosting_metrics_list-plan-order-disk-usage` with `time_frame_days: 7` — flag usage above 80% of the plan quota and name the heaviest websites.

Per Agency site: `agency-hosting_ssl_website-status` for each custom domain in `details.domains`; flag `details.state` other than `active`.

Plans about to lapse (billing product): `billing_subscriptions_list`, joined to hosting orders on `subscription_id` — flag `not_renewing`, or `is_auto_renewed: false` with `expires_at` within 30 days. Every site on that plan goes down with it.

From outside, for each custom domain:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" --max-time 15 https://DOMAIN/
curl -sSI --max-time 15 https://DOMAIN/ | grep -i "^platform"
```

No `platform: hostinger` header means the domain does not reach this hosting.

## 3. Report

```
# Hosting audit
3 plans (2 Shared, 1 Cloud) + 1 Agency · 14 websites (6 WordPress, 3 Node.js, 5 other) · 4 Agency sites

## Fix now
- shop.example.com — latest Node.js build failed 2 days ago → troubleshoot-website
- blog.example.com — contact-form-x 5.2 has a known vulnerability, fixed in 5.3 → maintain-wordpress

## Soon
- example.org — Business plan expires in 12 days, auto-renew off → renew in hPanel
- Agency order 1000000001 — 86% of disk quota, mostly client-a.com

## Worth knowing
- 4 WordPress installs have pending plugin updates → maintain-wordpress

## Healthy
docs.example.com, portfolio.example.com, …
```

- **Fix now:** site down or not reaching Hostinger, failed latest build, invalid WordPress install, SSL `failed` or `expired`, critical vulnerabilities, suspended website.
- **Soon:** high vulnerabilities, a plan lapsing within 30 days, usage above 80% of a quota, HTTPS redirect off, non-lifetime certificates expiring.
- **Worth knowing:** pending updates, inactive plugins with vulnerabilities.

Each item names the evidence and the skill that fixes it: `troubleshoot-website`, `maintain-wordpress`, `connect-domain` or `deploy-to-hosting`. Patchable npm vulnerabilities on GitHub-deployed sites can be fixed with `hosting_nodejs_patch-vulnerabilities`, which opens a pull request — offer it, do not run it as part of the audit.

## Not available through the API

CPU and memory usage for Shared and Cloud plans, website backup status, and PHP error logs. Mention them once at the end so the user knows what the audit could not see.
