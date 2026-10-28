---
name: people-search
description: Search people by job title, seniority, employer, company size, industry, past employer, city or tenure with the b2bsearch--people-database-search tool. Use when the user wants a list of people matching a profile ("CTOs at fintechs in Germany", "ops leaders who left Stripe after 2023", "fractional CFOs in the UK"), wants to know how many such people exist, or wants a market breakdown before buying rows. Counts and breakdowns are free; rows are paid per person. Also the tool for "everyone currently at these companies" (set companyDomains).
---

# People search

One tool, three modes. Always start with the free one.

| mode | What comes back | Cost |
|---|---|---|
| `count` | how many people match (`_total`) | free |
| `market` | the segment's shape: countries, seniority, employer size and industry, career start year, top titles, top employers | free |
| `people` | the rows | per person delivered |

Row tiers (`profileDetail`), charged per person and never per search:

| tier | Carries | Price per 1,000 |
|---|---|---|
| `row` | name, title, employer, location, email flags | $0.95 |
| `profile` | full career profile, no contacts | $3.20 |
| `contacts` | profile plus emails, phones, social links | $8 |

The price in the tool description is the one that applies if it differs from this table.

## Workflow

1. Translate the ask into filters. Keep the list of title words short (at most 10) and
   add `seniority` buckets so every spelling of a level is caught (`cxo`, `vp`,
   `director`, `manager`, `founder`, and so on, as the schema lists them).
2. Run `mode: "count"`. Show the number to the user.
3. If the segment is large or vague, run `mode: "market"` and read the top titles and
   employers: that is where wrong-fit people show up (a "head of sales" list full of
   car dealership staff means an industry filter is missing).
4. Only then run `mode: "people"` with `maxResults` set to the number the user wants.
   Default is 500, which is more than most asks. On the Free Apify plan a run returns
   up to 100 people and the account has 500 free rows a month.
5. Read the result with `get-dataset-items`. Pass `compact: true` on the run for
   2 KB rows instead of 10 KB.

## Filters worth knowing

- `countries` (two-letter codes) and `countryGroups` (`eu`, `dach`, `nordics`,
  `benelux`, `latam`, `mena`, `gcc`...). Leave both empty to search every country.
- `titleKeywords` match the current title; `headlineKeywords` match what people say
  they do. `titleMatch: "word"` stops "cto" from hitting "director".
- `companyDomains` keeps only people at those employers: this is how you pull the
  staff of a known company. `excludeCompanyDomains` drops customers and competitors.
- `employeeCountMin` / `employeeCountMax` filter by employer size. About half the
  companies on file have no headcount; `includeUnknownEmployerSize: true` keeps them
  (useful when small companies matter).
- `pastEmployerDomains` plus `leftPastEmployerAfterYear`: alumni of a competitor or a
  former customer. Roughly a third of past-employer matches never left (internal
  promotion closes a position); the default excludes them.
- `currentRoleStartedAfterYear` or `currentRoleStartedAfterDate`: recent job changers.
  `currentRoleStartedBeforeYear`: tenure.
- `onlyBetweenJobs: true`: people with no current position on record.
- `mustHave`: deliver and charge only people who have, for example, `personal_email`
  or `work_email`. The rest are skipped free and counted in one note row. Phone,
  social profiles and "work email at the current employer" need the `contacts` tier.
- `maxPerCompany`: stops one large employer from filling the list.
- `excludeDatasets`: datasets of earlier runs; nobody in them is delivered or charged
  again. Use it for weekly reruns.
- `segments`: compare up to 10 variants in one free count or market run, for example
  the same title across five countries.

## Reading the rows

Every row has `personId`, `fullName`, `title`, `companyName`, `companyDomain`,
`location`, email flags on the `row` tier, and on the paid tiers the career history,
education, skills and (contacts tier) `emails`, `phones`, social links. A `_note` row at
the end says what was skipped and why. `_freshness` and `updatedAt` say how old the
record is; `updatedAfter` filters on it.

## Do not

- Do not run `people` before `count`. A wrong filter costs real money per row.
- Do not pay for `contacts` when the user only needs names and titles.
- Do not use this tool to find job candidates for recruiting or to look up a named
  private individual; it is a B2B tool.
