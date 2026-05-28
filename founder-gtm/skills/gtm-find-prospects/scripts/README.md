# gtm-find-prospects/scripts

Small, real scrapers and utilities the `gtm-find-prospects` skill calls. Each one does one thing, writes CSV or JSON, and exits. Compose them.

| Script | What it does | Outputs |
|---|---|---|
| `techcrunch-funding-rss.py` | Pulls recent funding-round announcements from TechCrunch's RSS, filters by stage/sector keywords, returns one row per round | CSV: company, round, amount, lead, date, source_url |
| `hn-show-scraper.py` | Pulls "Show HN" launches from the Hacker News Algolia API in the last N days, filtered by keywords | CSV: title, company, url, hn_url, date, points, comments |
| `x-topic-search.py` | Uses the local xmcp MCP server to find people posting about a topic, ranked by recency and engagement | CSV: handle, name, bio, last_post_excerpt, last_post_date, faves, followers |
| `domain-histogram.py` | Takes a CSV of email addresses (or any column of emails) and returns a histogram of domains, separating personal from work | CSV: domain, count, kind (work/personal), sample_addresses |
| `title-classifier.py` | Classifies a list of job titles into persona buckets using a keyword-list + exclusion-regex approach (no LLM needed, no API key). Reads keyword lists from `../data/title-keywords.txt` and `../data/title-exclusions.txt` so founders can tune their ICP without editing Python | CSV: original cols + persona_bucket, persona_confidence, matched_keywords |

All scripts:
- Use stdlib + `requests` only where possible. No paid API dependencies.
- Print to stdout when run with `--print`; otherwise write to a path.
- Exit non-zero on real failures, zero on empty results.
- Are designed to be piped together. Output of one is valid input to the next.

## Install

```bash
pip install -r ${CURSOR_PLUGIN_ROOT}/skills/gtm-find-prospects/scripts/requirements.txt
```

## Compose example

```bash
# 1. Get recent Seed/A rounds in AI infra
python techcrunch-funding-rss.py --stages "Seed,Series A" --keywords "AI,LLM,infrastructure" \
  --since-days 60 --out funding.csv

# 2. Find people posting about your problem area on X
python x-topic-search.py --query '("AI evals" OR "LLM testing") -is:retweet' \
  --min-faves 5 --since-days 30 --out x_prospects.csv

# 3. Classify titles into personas (tune ../data/title-keywords.txt first)
python title-classifier.py --input x_prospects.csv --title-col bio \
  --out x_prospects_classified.csv
```

## Data files

`title-classifier.py` reads from `../data/`:

- `title-keywords.txt`, bucket definitions. One bucket per line, format: `bucket_name|include_keyword_1,include_keyword_2|exclude_keyword_1,exclude_keyword_2`. Edit to match your ICP.
- `title-exclusions.txt`, global exclusion regex (one pattern per line). Hits these and the row is dropped no matter what bucket would otherwise match. Use for "always wrong" titles like sales engineers when you want eng leaders.
- `personal-email-domains.txt`, read by `domain-histogram.py`. One domain per line. Defaults cover gmail / yahoo / outlook / icloud / proton / ru / cn providers. Add to it if you find others.
