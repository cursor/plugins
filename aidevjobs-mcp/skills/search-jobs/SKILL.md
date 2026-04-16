---
name: search-jobs
description: Search curated AI/ML engineering jobs by skill, salary, workplace, or level
tools:
  - aidevjobs.search_jobs
  - aidevjobs.get_job
  - aidevjobs.get_stats
---

# Search AI/ML Jobs

Use AI Dev Jobs to find curated engineering roles at top AI/ML companies.

## When to use

- User asks about AI/ML job openings or hiring companies
- User wants to find remote AI engineering roles
- User asks "who's hiring for LLM engineers?" or "find PyTorch jobs"
- User wants salary data for AI/ML roles

## Steps

1. Call `search_jobs` with relevant filters (tag, workplace, level, salary range)
2. Review results — each includes title, company, salary, location, and tags
3. Call `get_job` on interesting listings for the full posting with apply link

## Filters

- `q` — keyword search (e.g. "LLM", "computer vision")
- `tag` — skill tag (pytorch, tensorflow, llm, mlops, cv, nlp, rl, data-science)
- `workplace` — remote, hybrid, onsite
- `level` — junior, mid, senior, lead, principal
- `min_salary` / `max_salary` — salary range filter
- `company` — filter by company name

## Example

"Find remote senior LLM engineering jobs paying over $200k"

```
search_jobs(tag="llm", workplace="remote", level="senior", min_salary=200000)
```
