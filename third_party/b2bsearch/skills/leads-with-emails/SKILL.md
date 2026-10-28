---
name: leads-with-emails
description: Build a lead list where every row has a live email, with the b2bsearch--b2b-leads-finder tool. Use when the user wants contacts they can email now ("200 VPs of sales at US SaaS companies with emails", "leads for our outbound campaign"), wants to re-run a saved Apollo people search without an Apollo seat (paste the Apollo URL), or needs verified mobile numbers on the leads. People without an email are skipped free, so this is the tool for outbound; for sizing a market or pulling people without contacts use people-search instead.
---

# Leads with emails

`b2bsearch--b2b-leads-finder` returns only people who have an email on record. The
address is at the current employer when there is one, otherwise a personal mailbox.
Addresses at earlier employers never count. Each lead also carries the professional
profile URL and the X, GitHub and Facebook links on record.

Price: from $1.50 per 1,000 leads delivered ($3 on the Free Apify plan). People without
an email are skipped free. Free plan: up to 100 leads per run, 500 rows a month per
account. The tool description's price applies if it differs.

## Workflow

1. Size the segment first with `b2bsearch--people-database-search` in `mode: "count"`
   (free). Leads with an email are a fraction of that count, usually a third to a half,
   so expect fewer rows than the count.
2. Run the finder with `maxResults` set to what the user needs (default 100, maximum
   10,000). This is the spend cap.
3. Read rows with `get-dataset-items`.

## Inputs

- `jobTitles` (up to 10) plus `seniority` buckets. `excludeJobTitles` drops junior,
  assistant, intern.
- `countries`, `countryGroups`, `cities`, `companyHqCountries` (people anywhere who
  work for a company headquartered there).
- `industries` (names in either wording), `companySizeMin` / `companySizeMax`,
  `keywords` for headline words ("revops", "shopify").
- `companyDomains` for account-based lists (up to 1,000 domains);
  `excludeCompanyDomains` for customers, competitors and your own company;
  `pastCompanyDomains` for alumni.
- `emailType`: `any` (default), `work` (current-employer address only, fewer leads),
  `personal`.
- `includePhones: true` adds the verified mobile number on record (US-centric, about
  one in four US decision makers). Check the tool description for the price.
- `maxPerCompany` to spread the list across accounts.
- `excludeDatasets` with earlier runs so a weekly rerun delivers only new people.
- `apolloUrl`: paste a people-search URL from the Apollo app and the titles,
  seniority, locations, sizes, industries, keywords and domains are read from it.

## Output

Rows carry `fullName`, `title`, `companyName`, `companyDomain`, `email`, `emailType`
(work or personal), profile URL, social links, `phone` when requested, and
`_freshness`. A `_note` row summarises what was skipped.

## Rules

- Say in the reply which emails are personal and which are work addresses; the user's
  outreach rules may differ for each.
- Do not promise deliverability: the address is on record and live as of its
  `_freshness` date; it is not re-verified at request time.
- B2B outbound only. Not for consumer lists or for contacting a named private person.
