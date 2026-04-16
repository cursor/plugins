---
name: match-candidate
description: Rank AI/ML jobs against a candidate profile for personalized recommendations
tools:
  - aidevjobs.match_jobs
  - aidevjobs.get_job
  - aidevjobs.list_companies
---

# Match Jobs to a Candidate

Use AI Dev Jobs to rank active positions against a candidate's skills, preferences, and experience level.

## When to use

- User describes their background and asks "what jobs would be a good fit?"
- User wants personalized job recommendations based on their skills
- User asks "which AI companies should I apply to?"
- User wants to compare companies hiring for their skill set

## Steps

1. Gather the candidate's profile: skills, desired salary, workplace preference, level, and location
2. Call `match_jobs` with the profile to get scored recommendations
3. Call `get_job` on the top matches for full postings with apply links
4. Call `list_companies` to show which top companies match their profile

## Example

"I'm a senior ML engineer skilled in PyTorch and LLMs, looking for remote work around $250k"

```
match_jobs(skills=["pytorch", "llm"], level="senior", workplace="remote", salary=250000)
```
