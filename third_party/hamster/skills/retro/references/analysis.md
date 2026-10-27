# Retro Analysis Passes (Steps 4-13)

Run these after Step 3 of the retro skill. They consume the raw data gathered in Step 2 and the `$since` / `$days` variables set in Step 1, and they feed the snapshot (Step 14) and the narrative (Step 15).

---

## Step 4: Hourly Commit Distribution

- Build a histogram of commits by hour (local timezone)
- Identify peak hours and dead zones
- Flag late-night clusters (commits between 10pm-6am) as potential burnout signal

```bash
git log --since="$since" --format="%aH" | sort | uniq -c | sort -k2 -n
```

---

## Step 5: Work Session Detection

- Define a session break as a 45-minute gap between consecutive commits by the same author
- Classify sessions:
  - **Deep**: >2 hours
  - **Medium**: 45 minutes to 2 hours
  - **Micro**: <45 minutes
- Report session count and average duration per contributor

---

## Step 6: Commit Type Breakdown

Parse conventional commit prefixes from commit messages:

```bash
git log --since="$since" --format="%s" --no-merges | sed -E 's/^([a-z]+)[:(].*/\1/' | sort | uniq -c | sort -rn
```

- Calculate percentages for: feat, fix, refactor, test, chore, docs, other
- Flag if test ratio is below 15% (low test discipline)
- Flag if fix ratio exceeds 40% (reactive mode — more fixing than building)

---

## Step 7: Hotspot Analysis

From the most-changed files data:

- Top 10 most-changed files with change count
- Flag files changed >5 times as high churn (candidate for refactoring or stabilization)
- Flag large files (>800 lines) that are also hotspots (complexity risk)

```bash
# Check line counts for hotspot files
for f in $(git log --since="$since" --name-only --format="" | sort | uniq -c | sort -rn | head -10 | awk '{print $2}'); do
  [ -f "$f" ] && echo "$(wc -l < "$f") $f"
done
```

---

## Step 8: PR Size Distribution

Categorize merged PRs by lines changed:
- **Small**: <100 LOC
- **Medium**: 100-500 LOC
- **Large**: 500-1000 LOC
- **XL**: >1000 LOC

Report distribution. Flag if >30% are XL (PRs too large for effective review).

---

## Step 9: Focus Score

- Calculate the % of commits touching the most-changed directory
- Higher score = more focused work, lower = scattered across codebase
- Identify **Ship of the Week** — the PR or commit with the highest impact (most LOC added in a single cohesive change)

---

## Step 10: Per-Contributor Deep Dive

For each contributor with commits in the window:

- **Stats**: Commits, LOC added/removed, areas of focus (top 3 directories)
- **Commit type mix**: Are they mostly fixing or building?
- **Session patterns**: Deep vs micro work ratio
- **Test discipline**: % of their commits that include test file changes
- **Biggest ship**: Highest-LOC commit or PR
- **Praise**: Specific, earned, anchored in actual commits. Examples:
  - "Solid error handling in the auth refactor — 3 edge cases caught"
  - "Clean separation of concerns in the new API layer"
- **Growth opportunity**: Framed as investment advice. Examples:
  - "Adding integration tests to the payment flow would catch the type of issues that showed up in fix commits"
  - "Breaking the large PR into smaller chunks would speed up review cycles"

---

## Step 11: Week-over-Week Trends

Only if the time window is >= 14 days:

- Split the window into weekly buckets
- Compare per week: commits, LOC, test ratio, PR size, contributor count
- Use directional arrows: ↑ improving, ↓ declining, → stable

---

## Step 12: Streak Tracking

- Calculate consecutive days with commits (per contributor and team-wide)
- Report longest streak in the window
- Report current streak status (active or broken)

---

## Step 13: Historical Comparison

Check for prior retro snapshots:
```bash
ls .hamster/retros/*.json 2>/dev/null | sort -r | head -1
```

If found:
- Read the last snapshot
- Calculate deltas vs the current metrics
- Highlight notable changes: "Commits up 20% vs last retro", "Test ratio improved from 12% to 18%"
