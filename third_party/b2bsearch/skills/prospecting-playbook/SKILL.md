---
name: prospecting-playbook
description: Start here for any B2B list, lead, account or market-sizing request made with the b2bsearch tools ("find me leads", "who should we sell to", "how many X are there in Y", "decision makers at these companies", "companies hiring for Z"). Routes the ask to the right tool, insists on the free count before any paid rows, sets the spend cap, explains how runs and datasets come back, and names the Actor ids for the long tail reachable through call-actor. Read it before calling any b2bsearch tool for the first time in a conversation.
---

# Prospecting playbook

b2bsearch is a set of Actors on Apify that read one people and company database: 1B+
professional profiles, 115M companies, 50M+ job postings. Every tool charges per row
delivered and nothing per search; sizing a segment is free. The user pays Apify; on the
Free Apify plan each run returns up to 100 rows and the account has 500 free rows a month.

## 1. Scope

In scope: B2B sales and outbound, account research, partnerships, investor and market
research, hiring activity used as a signal about a company.

Out of scope: finding candidates to hire, helping someone find a job, consumer lists,
anything about a named private individual who is not acting for a company. If the ask
is ambiguous ("people in Berlin"), ask what it is for before running anything.

## 2. The ladder: count, shape, rows

1. Write the filters down and show them to the user in one line.
2. Run the free sizing call:
   - people: `b2bsearch--people-database-search` with `mode: "count"` (add
     `mode: "market"` for the breakdown);
   - companies: `b2bsearch--company-database-search` with `previewOnly: true`;
   - jobs: `b2bsearch--linkedin-job-search-api` with `previewOnly: true`.
3. Say the number and the price of the rows the user asked for. Wait for a yes when
   the run would cost more than a few dollars.
4. Run for rows with the cap set: `maxResults` or `limit` or `maxPerCompany`. The
   default caps are generous; set them to the number the user actually needs.
5. Read the rows with `get-dataset-items` (`limit`, `fields`, `clean: true`).

A list built without step 2 costs money to discover it targeted the wrong people.

## 3. Which tool

| The ask | Tool |
|---|---|
| People by title, seniority, employer, size, industry, past employer, tenure | `b2bsearch--people-database-search` |
| People with an email on every row, for outbound | `b2bsearch--b2b-leads-finder` |
| Companies by country, industry, size, founding year, funding | `b2bsearch--company-database-search` |
| Founders, C-level, VPs, directors at given domains, with email | `b2bsearch--domain-to-decision-makers` |
| Work email for a known name at a known company | `b2bsearch--work-email-finder` |
| Job postings as a signal; who is hiring; postings that mention a technology | `b2bsearch--linkedin-job-search-api` |

The long tail runs through `call-actor` with `actor` set to the id and `input` as the
Actor expects. `fetch-actor-details` with `output: { inputSchema: true }` returns the
schema when a field is unclear.

| Actor id | Use |
|---|---|
| `b2bsearch/company-employees` | the whole roster of a company by domain |
| `b2bsearch/new-hires-finder` | who joined a company in the last N months |
| `b2bsearch/lookalike-company-finder` | companies similar to seed domains |
| `b2bsearch/domain-to-company` | firmographics for a list of domains |
| `b2bsearch/reverse-email-lookup` | email in, person out |
| `b2bsearch/name-to-profile` | name plus domain in, profile out |
| `b2bsearch/bulk-people-enrichment` | a CSV of emails, profile URLs or names |
| `b2bsearch/hiring-companies-finder` | employers behind a job search, with hiring pace |
| `b2bsearch/linkedin-email-finder` | email for a list of profile URLs |
| `b2bsearch/sales-navigator-search` | run a saved Sales Navigator search URL |

`callOptions.maxTotalChargeUsd` on `call-actor` is a hard spend cap for the run.

## 4. How a run comes back

A tool call returns the run summary: status, `datasetId`, item count, the field list.
With the default `waitSecs` (30) most runs finish inside the call; a large run returns
`RUNNING` with a `nextStep`, poll it with `get-actor-run`. Then fetch rows with
`get-dataset-items`. Ask for `compact: true` on people tools (2 KB per person instead of
10 KB) and use `fields` to project only what the answer needs.

Rows that were skipped (no email, over the per-company cap, already delivered in an
earlier dataset) are counted in a single `_note` row; read it, it explains the gap
between the count and the delivery.

## 5. Keeping lists clean

- `excludeCompanyDomains`: customers, competitors, the user's own company.
- `excludeDatasets`: earlier runs; nobody in them is delivered or charged again.
- `maxPerCompany`: no single employer fills the list.
- `mustHave`: deliver and charge only rows with what the user needs (an email, a
  phone), the rest are skipped free.
- `updatedAfter`: leave out stale records when freshness matters.

## 6. Reporting to the user

Give the count, the number delivered, what was skipped and why, the price actually
charged (the run summary carries it), and the dataset id so the user can open the rows
in Apify Console or export CSV and Excel from there. Label emails as work or personal.
Never claim an address was verified unless a verification field says so.
