---
name: jobs-and-hiring-signals
description: Use job postings as a buying or market signal with b2bsearch--linkedin-job-search-api (50M+ postings, boolean title and description search, employer size, industry, seniority, salary, applicants, expired jobs; free preview with breakdowns) and, through call-actor, b2bsearch/hiring-companies-finder (the employers behind a job search, most open postings first, with hiring pace and the people to contact). Use when the user asks who is hiring for a role, which companies are growing a team, which employers mention a technology in their postings, how many jobs match a search, or wants decision makers at companies that are hiring.
---

# Jobs and hiring signals

A company hiring three SDRs is buying sales tooling; a company hiring a Kubernetes
engineer runs Kubernetes. Postings are a signal about the employer, and that is how
this skill uses them.

## Search postings: `b2bsearch--linkedin-job-search-api`

Always run `previewOnly: true` first: it returns how many jobs match and the breakdown
by country, seniority, employment type, industry, top employers, titles and cities, at no
charge. Then run with `previewOnly: false` and `limit` set to what the user needs
(default 100; 0 means up to 10,000). `limit` is the spend cap.

Inputs:

- `titleSearch`: one query per line, whole words, boolean allowed:
  `(backend OR platform) engineer NOT intern`. `titleExclusionSearch` for words the
  title must not contain.
- `descriptionSearch`: the technology or the tool ("kubernetes", "HubSpot"); needs a
  country with a time range, or an employer list. `descriptionExclusionSearch` too.
- `locationSearch`: countries by name or code, US states, cities. A search needs a
  country unless it names employers.
- `timeRange`: `24h`, `7d` (default), `30d`, `90d`, `6m`. `datePostedAfter` for syncs.
- Employers: `organizationSlugFilter` (page slug, URL, domain or id, up to 100; an
  employer list alone is a complete search), `organizationSearch` (name match),
  `organizationEmployeesGte` / `organizationEmployeesLte`, `organizationSizeFilter`.
- `removeAgency: true` drops staffing firms and job boards.
- `seniorityFilter`, `employmentTypeFilter`, `industryFilter`, `hasSalary`,
  `salaryMin`, `maxApplicants` ("Under 25" is the closest thing to few applicants),
  `recruiterOnly` (postings that name the recruiter, about one in nine).
- `status: "expired"` with `expiredAfter` is the feed of what closed since a date.
- `employerHiring: true` adds, free, the employer's open postings now, postings in the
  last 7, 30 and 90 days and its top titles: the hiring-pace signal.
- `decisionMakers: true` adds, after each job, the employer's founders, C-level, VPs
  and directors as separate rows (`decisionMakersPerCompany`, default 3; $3.20 per
  1,000 people).
- `compact: true` cuts the description to 300 characters for context-limited agents.

Price per job delivered is in the tool description.

## Employers behind a search: `b2bsearch/hiring-companies-finder` (via `call-actor`)

Input: `jobTitles` (boolean allowed), `locations` (at least one country),
`maxCompanies` (default 25; 0 means up to 2,000), `postedLimit` (`week`, `month`,
`3months`), `previewOnly` for a free count, `decisionMakers: true` to add the people to
contact, `excludeAgencies` (on by default).

Output: one row per employer, most matching postings first, with the company card, its
hiring pace over 7, 30 and 90 days, levels and top titles, then the decision-maker rows.
Price per employer is in the Actor description.

Use it when the user wants a list of companies, not of jobs. Use the jobs tool when
the posting text itself matters.

## Rules

- Report the data date the row carries; the database is reloaded after each update.
- A posting is evidence that a role is open, not that a budget exists for your product;
  say so when the user plans outreach on it.
- Not for job seekers looking for openings to apply to; the plugin's purpose is B2B
  research.
