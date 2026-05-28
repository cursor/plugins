---
name: gtm-find-prospects
description: Builds a ranked prospect list for an early-stage founder. Reads sales-pack.md for ICP and persona criteria, asks the founder what data sources they already pay for, then combines those with free sources (LinkedIn search, X via xmcp, GitHub orgs, Crunchbase free, TechCrunch funding RSS, Show HN, Product Hunt, public event attendee lists) to produce a ranked CSV at `prospects/{campaign}.csv`. Supports two modes: person-signal (one human did something interesting) and account-signal (a company hit a threshold; we find the right person inside). Includes a title classifier with exclusion list to filter out look-alike-but-wrong titles before any paid enrichment. Use when a founder needs a target list, says they want leads, asks who to message, runs /gtm-find-prospects, or before any outreach campaign.
---

# Find Prospects, scrappy targeting for founders

You are building a target list for an early-stage founder. The output is one CSV per campaign that the channel skills (`gtm-x-outreach`, `gtm-linkedin-outreach`, `gtm-cold-email`) read directly.

## Prerequisite check

```bash
test -f sales-pack.md || echo "MISSING"
```

If `sales-pack.md` is missing, refuse to proceed. Tell the founder you need their sales pack first, then invoke the `gtm-sales-pack` skill.

Parse `sales-pack.md` for the `## ICP`, `## Personas`, and `## Buying signals` sections. These become your targeting criteria.

## How this differs from Clay or Apollo

Both are great. They are also $800-$2000/mo before you have product-market fit. The framework this skill uses is the same one mature growth teams use, distilled into a free-first version:

**Signal → Persona → Source → Enrich → Rank → Hand off**

1. **Signal**: a real-world event indicating buying intent (just raised, just hired, just shipped, just complained on X).
2. **Persona**: which role at the company you would actually message, informed by `sales-pack.md`.
3. **Source**: where you find the signal-and-persona combination (free or paid).
4. **Enrich**: add contact info (LinkedIn URL, X handle, email pattern) once the prospect passes the bar.
5. **Rank**: order by signal strength, persona fit, reachability, and warm connections.
6. **Hand off**: write the CSV and tell the founder which channel skill to run next.

## Two modes

Founders almost always start in **person mode** and discover account mode later. Default to person unless the founder hands you a list of companies.

### Person mode (default)

You start from a signal that happened to a specific human. You already know who you want to message; you only need to enrich and rank.

> "Find me people who recently posted on X about AI evaluations and look like engineering leaders at small startups."

### Account mode

You start from a list of companies (funding round list, conference attendee company list, lookalike of an existing customer, hand-curated target accounts). For each, you need to **find the right human inside** before any outreach.

> "I have a list of 50 companies that raised seed rounds in the last 60 days. Find me the VP Eng or founder at each."

Account-mode rows in the CSV have `account_signal`, `suggested_personas[]`, and `find_persona_recipe` columns instead of named individuals. The skill then either suggests a follow-up "enrich these to named contacts" run, or the founder fills in names manually.

## Workflow

### Step 1: Tool inventory

Ask the founder what they have. AskQuestion, multi-select:

```
Question: "What targeting tools do you have access to? Pick everything you have. We'll prefer paid sources where you have them and fill gaps with free scraping/search."
Options:
- Apollo (paid)
- Clay (paid)
- Amplemarket (paid)
- ZoomInfo (paid)
- LinkedIn Sales Navigator (paid)
- A CSV/spreadsheet I already have
- Local xmcp MCP server (free X access with my OAuth)
- LinkedIn Premium or Recruiter
- Just whatever's free
```

Persist the answer to `${CURSOR_PLUGIN_ROOT}/.gtm-state/tools.json` so future runs don't re-ask. For paid tools, ask only for the variable name where the key lives in `.env`; never store the key yourself.

### Step 2: Define the campaign

```
Question: "What's this campaign about? Pick the signal."
Options:
- Recent funding rounds (seed / A / B in last 90 days, matching ICP)
- Recent role changes (people who just started a buyer-persona role)
- Recent shipping (Show HN, Product Hunt, company changelogs)
- Recent complaining (people on X/Reddit who recently complained about a problem you solve)
- Specific company list (account mode — I have a list)
- Conference / event attendees (I have a list)
- Lookalike of an existing customer
- Other (I'll describe)
```

Also ask:
- **Campaign name** (slug, e.g. `seed-fundraisers-2026-01`)
- **Target count** (default 50, max 200; large lists kill personalization)
- **Mode** (auto-detect from signal: `Specific company list` → account mode; everything else → person mode by default)

### Step 3: Run the source(s)

Use the matrix below. Always reach for the highest-signal source first.

| Signal | Best paid source | Free fallback | Helper script |
|---|---|---|---|
| Recent funding | Crunchbase Pro, Clay | TechCrunch venture RSS, Axios Pro Rata, Term Sheet | `scripts/techcrunch-funding-rss.py` |
| Recent role changes | Sales Navigator alerts, ZoomInfo | LinkedIn "started a new job" filter | manual LinkedIn search |
| Recent shipping |, | Show HN (Algolia API), Product Hunt | `scripts/hn-show-scraper.py` |
| Recent complaining |, | xmcp `searchPostsRecent`, Reddit search, HN search | `scripts/x-topic-search.py` |
| Specific company list | Apollo / Clay (instant enrich) | LinkedIn manual + Hunter.io + pattern guess | none, account mode handles this |
| Conference attendees |, | Conference attendee X lists, Luma event pages | bring your own CSV |
| Lookalike | Clay (similarity), Apollo | 3-attribute extraction + LinkedIn / Crunchbase / X bio cross-search; see Step 3.5 | manual + title classifier |

For the X path, the xmcp scripts let you do bio-keyword filtering and pull each candidate's best recent post as a pre-built hook for the `gtm-x-outreach` skill.

### Step 3.5: Lookalike enrichment (when the signal is "Lookalike of an existing customer")

The signal-source matrix in Step 3 lists "lookalike" as a row but the recipe is below because it spans multiple data sources. Run this step only when the founder picked "Lookalike of an existing customer" in Step 2.

**Why lookalikes work.** Your best existing customers share traits that predict fit. A 3-customer pattern is enough to start; a 5-customer pattern is reliable. The point is to mine those traits and turn them into search queries.

#### 3.5.1: Ask the founder for 3 to 5 best existing customers

```
Question: "Which existing customers should we look-alike from? Pick 3 to 5 of your best (highest contract value, fastest activation, most product engagement, or whatever 'best' means for you)."
Options:
- Read from existing-customers.txt at project root (if it exists)
- Paste a list of company names inline
- I will give them to you one at a time
```

If `existing-customers.txt` exists, prefer it. Show the founder the list and ask them to star (`*`) the 3 to 5 they would clone if they could. If they have not maintained this file, ask them to name the 3 to 5 now.

#### 3.5.2: For each customer, extract 3 attributes

For each of the 3 to 5 customers, populate these attributes. Pull from public sources only (no internal CRM, no logged-in scraping).

| Attribute | How to gather (free path) | How to gather (paid path) |
|---|---|---|
| Industry | Their LinkedIn company page "Industry" field; their About page on their site | Crunchbase free tier industry tags |
| Company size band | LinkedIn "Company size" range; About page if they publish it | Apollo, ZoomInfo size band |
| Tech stack indicators | Their public engineering blog tags, GitHub org public repos, StackShare if listed, job posts mentioning technologies | BuiltWith free tier for the marketing site |
| Recent funding round | TechCrunch search, Crunchbase free tier | Pitchbook, Crunchbase Pro |

Save the per-customer attribute set to `.gtm-state/lookalike-source-{campaign-name}.json` so re-runs do not re-fetch.

#### 3.5.3: Aggregate the dominant pattern

Across the 3 to 5 source customers, identify the dominant value for each attribute. A "dominant" value is one that shows up in at least 3 of 5 (or 2 of 3) source customers.

```json
{
  "industry_dominant": "B2B SaaS dev tools",
  "size_band_dominant": "50 to 200 employees",
  "tech_stack_dominant": ["TypeScript", "Postgres", "self-hosted observability"],
  "recency_filter": "raised Series A or B in last 18 months"
}
```

If no attribute is dominant (high spread across customers), tell the founder honestly: "Your best customers do not cluster cleanly. Lookalike mode will produce noisy results. Consider going back to a signal-based campaign instead, or add 2 to 3 more best-customer examples to find the pattern."

#### 3.5.4: Build the search queries

Translate the dominant pattern into actual queries. Three sources to run in parallel:

**LinkedIn company search filters:**
```
- Industry: {{industry_dominant}}
- Company size: {{size_band_dominant}}
- Headquarters location: {{founder ICP region, e.g. United States}}
- Optional growth signal: "follower count grew 25%+ in last 90 days" (Sales Nav only)
```

**Crunchbase tag search (free tier):**
```
- Industry group tag: {{closest Crunchbase tag to industry_dominant}}
- Operating status: Active
- Last funding round: {{recency_filter mapped to round type + date filter}}
```

**X bio keyword search via xmcp:**
For each tech_stack_dominant entry that maps to a community keyword (e.g. "Postgres", "TypeScript"), search X bios:
```python
# via xmcp's search-users-by-bio-keyword tool (or searchPostsRecent with bio filter)
queries = [
  "co-founder OR cto OR head of eng " + tech_keyword
  for tech_keyword in tech_stack_dominant
]
```

For each query, collect candidate company names + URLs.

#### 3.5.5: Dedupe and merge

- Drop any company already in `existing-customers.txt`.
- Drop any company already in `pipeline.txt`.
- Drop any company already in the source 3 to 5 (do not lookalike yourself).
- Dedupe by domain (canonicalize: strip `www.`, strip `http(s)://`, lowercase).
- Merge LinkedIn / Crunchbase / X candidates into one list. If a company appears in 2+ sources, that is a stronger signal (boost score in Step 8).

Cap the merged list at the founder's target count from Step 2.

#### 3.5.6: Output to standard prospects CSV

Write to `prospects/{campaign-name}.csv` using the schema in Step 9. Specifically for lookalike rows:

- `signal` = `lookalike`
- `signal_evidence` = `Matches {{N}} of 3 attributes from best customers {{customer_1, customer_2, ...}}: {{matched_attributes}}`
- `signal_strength` = `high` when all 3 attributes match, `medium` when 2 of 3 match, `low` when only 1 matches.
- `score boost`: add +10 to the Step 8 score for rows where all 3 attributes match (this is the "lookalike triangle hit", the strongest lookalike signal we have).

After Step 8 ranking, top of the list should be exact-attribute matches; the bottom should be partial matches the founder can review or drop.

#### 3.5.7: Persona enrichment

Lookalike mode is account-mode by default (you have companies, not people). After Step 3.5.6, the founder picks a persona from `sales-pack.md § Personas`, then either:

- Runs the persona enrichment subflow against the company list (LinkedIn search for `{{persona title pattern}} at {{company}}`), or
- Marks the list as "company-level only" and hands off to a follow-up enrichment pass.

The output CSV for lookalike mode should have both `company` and the `find_persona_recipe` filled in even if `full_name` is empty for some rows.

### Step 4: Enrich (multi-anchor cascade)

For each candidate row, attempt to populate these in order. Stop as soon as you have what you need for the chosen channel.

```
Identity anchors (from most reliable to least):
  1. LinkedIn URL
  2. Company domain
  3. Work email (verified)
  4. Personal email (gmail, etc. — see data/personal-email-domains.txt)
  5. X handle
  6. GitHub handle
```

**Personal-email bridge.** If the only contact you have is a personal email (gmail, icloud, etc.) and you don't know the company, search LinkedIn for that name and find their current employer separately. This is how you catch a founder who signed up to your product with their personal Gmail; their company is on LinkedIn, not in the email.

**Email finding cascade (when you need email and don't have it):**

1. Founder's paid tool (Apollo, Clay, Amplemarket) → enriched email.
2. Hunter.io free tier (25 lookups/mo) at `hunter.io/email-finder`.
3. Pattern guessing using a known email at the domain (`firstname.lastname@`, `flast@`, etc.). Verify with NeverBounce free tier before sending.
4. Skip the row if you can't find an email and email is the only channel.

**LinkedIn URL** is almost always findable via Google: `"FirstName LastName" "Company" site:linkedin.com/in`.

Mark contact-info confidence per row: `confirmed`, `pattern-guess`, `unverified`. The channel skills use this to decide whether to send or save as a draft for the founder to review.

### Step 5: Apply the title classifier

Once you have a `role` column populated, run the title classifier:

```bash
python ${CURSOR_PLUGIN_ROOT}/skills/gtm-find-prospects/scripts/title-classifier.py \
  --input prospects/raw.csv \
  --out prospects/classified.csv
```

This adds four columns based on keyword lists in `data/title-keywords.txt` and `data/title-exclusions.txt`:

- `persona_bucket`, the first matching persona bucket from `data/title-keywords.txt` (e.g. `cto`, `vp_engineering`, `staff_principal_engineer`)
- `persona_confidence`, `high` when 2+ keywords matched, `medium` when 1 keyword matched, blank when no persona matched
- `matched_keywords`, the pipe-separated keywords that matched
- `exclusion_reason`, populated when an exclusion matched (e.g. `sales engineer`, `chief of staff`)

Edit the data files to fit your ICP. The defaults are tuned for "VP+ engineering at startups" and exclude common look-alikes like Director of Sales Engineering, Chief of Staff, Customer Success leaders, and hardware engineers.

### Step 6: Apply account-fit filters

Before ranking, drop rows that fail any of these:

- [ ] **Not already a customer** (founder maintains an `existing-customers.txt` file in the project root; skill checks each domain against it)
- [ ] **Not already in active pipeline** (similar `pipeline.txt` if the founder tracks one)
- [ ] **Geography matches ICP** (default: don't drop, but flag)
- [ ] **Company size matches ICP** (founder sets `min_employees` and `max_employees` in `sales-pack.md`; skill parses them)
- [ ] **Not a child account** of an existing customer
- [ ] **Domain isn't a personal-email domain treated as a company** (gmail.com is not a company; check against `data/personal-email-domains.txt`)
- [ ] **Industry / segment matches ICP** when known

This is the cheap filter that prevents you from spending personalization effort on prospects who would be a hard "no" before you said hello.

### Step 7: Run domain histogram (when you have an email list)

If the source was an attendee list or anything with raw emails, run:

```bash
python scripts/domain-histogram.py --input prospects/raw.csv --email-column email
```

You will see:

```
total rows: 134
  with email: 128 (96%)
  empty: 6

  business: 51 (40%)
  personal: 77 (60%)

top 20 domains (business + personal mixed):
   34  gmail.com [personal]
   18  outlook.com [personal]
   12  acme.com
    8  example.io
   ...
```

If 60%+ of the list is personal-domain email, you have two choices:

- Run the personal-email bridge step (LinkedIn-lookup each personal email to find the actual company).
- Drop everything that isn't business email if the channel is cold email (deliverability matters more than coverage).

Either way: don't push a personal-email-heavy list straight to a paid enrichment tool. Costs add up and most enrichers fail on personal addresses.

### Step 8: Rank

Score each candidate 0 to 100:

| Factor | Weight | How to score |
|---|---|---|
| Signal strength | 35 | High (just funded, just complained about your problem) = 35. Medium (recently changed roles, recently shipped) = 22. Low (matches persona) = 8. |
| Persona fit | 30 | `persona_bucket` matches the target persona and `persona_confidence` is high or medium = 30. Adjacent engineering leadership bucket = 18. `staff_principal_engineer` or `founding_engineer` at the right company = 12. Rows with `exclusion_reason` populated should usually be dropped before ranking. |
| Reachability | 15 | Email confirmed + LinkedIn + X = 15. Two of three = 9. One = 4. |
| Warm path | 10 | Accelerator batchmate, shared connection, mutual follow, shared work history = 10. Otherwise 0. |
| Play priors | 10 | Bump up if the signal type has worked for this founder before (read from `outreach-log/learned-*.md`). Defaults to 0 for first campaign. |

Sort desc. Drop anything below 30. Cap at the founder's target count.

**Honest note on play priors:** for a founder's first campaign there's no history to weight. Skip this column the first time. After 2 to 3 campaigns and a `/gtm-get-better` run, the learning files exist and this column starts paying off.

### Step 9: Write the CSV

Output to `prospects/{campaign-name}.csv`. Schema (channel skills depend on it):

```csv
score,full_name,company,role,linkedin_url,x_handle,email,email_confidence,signal,signal_strength,signal_evidence,recommended_channel,hook,warm_path,notes
```

| Column | Description |
|---|---|
| `score` | 0 to 100 from Step 8 |
| `full_name` | First + last (empty in account mode) |
| `company` | Company name |
| `role` | Job title (empty in account mode) |
| `linkedin_url` | Full URL or empty |
| `x_handle` | `@handle` or empty |
| `email` | Email if found |
| `email_confidence` | `confirmed` / `pattern-guess` / `unverified` |
| `signal` | Category from Step 2 |
| `signal_strength` | `high` / `medium` / `low`, used by channel skills to pick CTA tier |
| `signal_evidence` | One line with the proof and a date |
| `recommended_channel` | `x` / `linkedin` / `email` / `multi` |
| `hook` | One-sentence personalization hook the channel skill will use |
| `warm_path` | Note about any mutual connection or shared context, if you found one |
| `notes` | Anything else useful |

**Account mode** writes a parallel schema with `account_signal`, `suggested_personas`, and `find_persona_recipe` (e.g. `"LinkedIn search: 'VP Engineering' OR 'Head of Engineering' at {company} who started in last 90 days"`) instead of named individuals.

### Step 10: Event-attendee subflow (when applicable)

If the source is an event attendee list (Luma export, conference badge scan, webinar registrants):

1. Run `domain-histogram.py` first to see the personal/business mix.
2. Tag each row with `signal=joined_event`, `signal_evidence=Joined {event_name} on {date}`, `signal_strength=medium` (event attendance is a real signal but not as strong as direct complaining or active shipping).
3. For business-email attendees, fast-path through enrichment (email is already verified).
4. For personal-email attendees, decide: bridge via LinkedIn (slow but worth it for the right event), or drop (cheap; OK for low-fit events).

### Step 11: Hand off

Tell the founder where the CSV lives, the top 5 prospects with their hooks, and which channel skill to run next. Suggest sending the first 5 by hand before batching the rest. Always.

## Quality bar before saving

- [ ] Every row has `signal` and `signal_evidence` (no "just a name" rows)
- [ ] Every person-mode row has `hook` written for that person specifically
- [ ] Every row has at least one of `linkedin_url`, `x_handle`, `email`
- [ ] No duplicate rows (dedupe by `full_name + company` for person mode, by `company` for account mode)
- [ ] Top 5 spot-check: ranking correlates with signal × persona fit
- [ ] If 50%+ of rows are `email_confidence=pattern-guess`, tell the founder honestly

If quality fails, re-run the relevant step. Quality beats volume every time at this stage.

## Honest disclosure to the founder

When you hand off, be specific about confidence:

> "This list has 47 prospects ranked by signal strength. Top 12 are high-confidence (strong signal, exact persona, multiple channels). Next 20 are solid (medium signal, good persona fit). Bottom 15 are pattern-guessed emails or weaker signals, send those to drafts mode and review before sending."

## What this skill does not do

- Send messages (channel skills do that).
- Store contact info outside the local CSV (no SaaS upload, no third-party sync).
- Scrape LinkedIn at scale or violate platform ToS. Search via your own logged-in session is fine; mass-scraping is not.
- Buy data. Every paid source the founder uses requires them to already pay for it.

## Scripts in this folder

See `scripts/README.md` for full details. The short version:

- `title-classifier.py`, deterministic role filter; reads from `data/`
- `techcrunch-funding-rss.py`, recent funding rounds
- `hn-show-scraper.py`, Show HN "just shipped" posts
- `x-topic-search.py`, bio + topic search via xmcp
- `domain-histogram.py`, personal vs business email mix before enrichment

These are intentionally small and standard-library-first so a founder can read and modify them. Anything more sophisticated lives in the channel skills, where it's needed for sending.
