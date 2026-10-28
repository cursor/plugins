---
name: company-lists
description: Build company lists and look companies up, with b2bsearch--company-database-search (filter 115M companies by country, industry, HQ city, founding year, headcount and last funding round; free count preview) and, through call-actor, b2bsearch/lookalike-company-finder (similar companies from seed domains) and b2bsearch/domain-to-company (firmographics for a list of domains). Use when the user wants target accounts, a funded-companies list, lookalikes of their best customers, or company cards for domains they already have.
---

# Company lists

## Search by filters: `b2bsearch--company-database-search`

Always run `previewOnly: true` first. It answers with the number of matching companies
and costs nothing. Then run with `previewOnly: false` and `maxResults` set to what the
user needs (default 500; Free Apify plan: up to 100 per run, 500 rows a month).

Price: $1.50 per 1,000 rows. Rows come largest first (`sort: employee_count_desc`).

Filters:

- `countries`, `countryGroups`, `excludeCountries`.
- `industries`: names in either wording or taxonomy ids; a sector covers everything
  under it. An unknown name fails the run before anything is charged and the error
  names the closest match.
- `hqLocations`: free-text match on the HQ address ("Berlin", "Texas").
- `employeesMin` / `employeesMax`. Companies with no recorded headcount are left out
  unless `includeCompaniesWithoutHeadcount: true`.
- `foundedFrom` / `foundedTo`.
- Funding: `hasFunding`, `fundingRounds` (the LAST recorded round, so "Seed" means
  "has not raised past seed"), `fundedAfter` / `fundedBefore` for a vintage,
  `fundingAmountMin` / `fundingAmountMax`.
- `companyDomains` (up to 50) to fetch specific companies.

Each row: name, domain, company page URL, industry, headcount, HQ, country, founding
year, last funding round with stage, amount and date.

## Lookalikes: `b2bsearch/lookalike-company-finder` (via `call-actor`)

Input: `seedDomains` (up to 50), `maxPerSeed` (default 25), `sameCountry` and
`sameSize` (both on by default), or `countries` to look elsewhere. Every row says which
of industry, country and size band it matched on. $1.50 per 1,000 found; seeds that
resolve to nothing are free.

Use it when the user says "more companies like these three customers".

## Firmographics for known domains: `b2bsearch/domain-to-company` (via `call-actor`)

Input: `domains`, bare or as any URL on the site. One company card per domain: name,
company page URL, headcount, industry, country, HQ, founding year, description, last
funding round. Misses are free. Check the tool description for the current price.

## From companies to people

A company list is usually step one. Hand the domains to:

- `b2bsearch--domain-to-decision-makers` for founders, C-level, VPs and directors
  with the email that reaches them (see decision-makers-and-emails).
- `b2bsearch--people-database-search` with `companyDomains` for the wider staff.
- `b2bsearch--b2b-leads-finder` with `companyDomains` for staff with emails only.
