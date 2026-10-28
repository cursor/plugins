---
name: decision-makers-and-emails
description: Find the people to contact at specific companies and the email that reaches them. b2bsearch--domain-to-decision-makers gives founders, C-level, VPs and directors by website domain with an email; b2bsearch--work-email-finder finds a work address from a name and a domain with deliverability evidence. Through call-actor the same family covers reverse-email-lookup (email in, person out), name-to-profile (name plus domain in, profile out), bulk-people-enrichment (a CSV of emails, profile URLs or names), company-employees (the full roster of a company) and new-hires-finder (who joined recently). Use for "who runs marketing at acme.com", "get me the email of Jane Smith at acme.com", "enrich this CSV", "who did they hire this quarter".
---

# Decision makers and emails

## Who to contact at a company: `b2bsearch--domain-to-decision-makers`

Input: `domains` (up to 500 per run, URLs are reduced to the domain), `roles` (default
`cxo`, `founder`, `vp`, `director`), `maxPerCompany` (default 10, maximum 100),
`titleKeywords` to keep only, say, marketing or finance.

Rows are ordered founder plus CEO first, then the rest of the C-level, VPs, directors,
so a small cap returns the top of the company. Each row: name, title, seniority,
profile URL, location, and `email` (work at the company, else personal). Domains with
nobody on record come back as free rows.

Price: $3.20 per 1,000 people found. `maxPerCompany` is the spend cap per company.

## Work email from a name: `b2bsearch--work-email-finder`

Input: `lookups` as `[{ "domain": "acme.com", "full_name": "Jane Smith" }]` (or
`first_name` plus `last_name`), or a CSV in `csv` / `csvFile` with a domain column and a
name column, up to 1,000 rows. `verifyTopCandidate: true` checks the best candidate
against the mail domain and stamps `valid`, `invalid`, `catch-all` or `unknown` on the
row (billed separately per check).

Output: ranked candidates per person with the evidence behind each. Nothing found means
nothing charged. $8 per 1,000 names that produce candidates.

Use it when the person is known by name and the decision-makers tool did not list them.

## The rest of the family (via `call-actor`, Actor ids below)

| Actor | In | Out |
|---|---|---|
| `b2bsearch/reverse-email-lookup` | `emails` | the person: name, title, employer, profile URL, career history; `contacts: true` adds their other emails and phones |
| `b2bsearch/name-to-profile` | `names` like `"Jane Smith, acme.com"`, or `companyDomain` for a whole list | profile URL and full profile; namesakes come back as a free refusal |
| `b2bsearch/bulk-people-enrichment` | `csv` with email, profile_url, full_name plus domain, github, twitter or facebook columns (up to 50,000 rows) | one enriched row per input row, resolved by the strongest key |
| `b2bsearch/company-employees` | `companies` (domains), `roles`, `titleContains`, `profileDetail` roster / profile / contacts | the staff list of a company |
| `b2bsearch/new-hires-finder` | `companyDomains` (up to 50), `sinceMonths` (default 6), `seniority`, `jobTitles` | who joined, with start month and the employer they came from |

All of them: misses are free, `compact: true` returns 2 KB rows, `mustHave` delivers
and charges only rows that have what you need. Prices are in each Actor's description;
`fetch-actor-details` returns the input schema when a field is unclear.

## Rules

- Prefer the decision-makers tool over a roster when the ask is "who do I talk to".
- One run per list, not one run per domain: all these tools take lists.
- Tell the user whether each email is a work or a personal address; `emailType` or the
  field name says which.
- B2B use only. Do not look up a private individual who is not acting for a company.
