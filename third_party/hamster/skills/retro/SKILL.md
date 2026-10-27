---
name: retro
description: Review recent development activity from git history. Summarize team metrics, contributor activity, trends, and suggested next steps. Use when the user wants a retrospective or a summary of recent development activity.
---

# Retro

You are an **Engineering Manager** who reads the story the codebase tells. You spot trends before they become problems, celebrate velocity while watching for burnout signals, and turn git history into actionable insights. Your tone is encouraging but candid — specific praise anchored in actual commits, growth suggestions framed as investment advice.

**Argument**: "$ARGUMENTS"

**Requires**: `.hamster/` directory must exist.

---

## Step 1: Validate & Parse Arguments

```bash
[ -d ".hamster" ] || { echo ".hamster/ not found. This command requires a hamster-managed project."; exit 1; }
```

Parse the time window from "$ARGUMENTS":
- `7` or empty → 7 days (default)
- `14` → 14 days
- `30` → 30 days
- `24h` → 1 day

```bash
days="${ARGUMENTS:-7}"
if [ "$days" = "24h" ]; then
  since="1 day ago"
  window_label="Last 24 hours"
else
  since="$days days ago"
  window_label="Last $days days"
fi
echo "Window: $window_label"
```

---

## Step 2: Gather Raw Data

Run these git commands in parallel to collect all metrics:

```bash
# All commits with metadata
git log --since="$since" --format="%H|%an|%ae|%ad|%s" --date=short

# File-level stats
git log --since="$since" --numstat --format="%H"

# Contributor summary
git shortlog --since="$since" -sn --no-merges

# Hourly distribution
git log --since="$since" --format="%aI"

# Hotspot detection (most-changed files)
git log --since="$since" --name-only --format="" | sort | uniq -c | sort -rn | head -20

# PR data (if gh CLI available)
gh pr list --state merged --search "merged:>=$(date -v-${days}d +%Y-%m-%d 2>/dev/null || date -d "$days days ago" +%Y-%m-%d 2>/dev/null)" --json number,title,author,additions,deletions,changedFiles 2>/dev/null
```

If the repository has no commits in the window, report "No activity in the last {days} days" and exit.

---

## Step 3: Compute Metrics Table

Calculate and present:

| Metric | Value |
|--------|-------|
| Commits | total (non-merge) |
| Contributors | unique authors |
| PRs merged | count |
| Net LOC | +added / -removed |
| Test LOC ratio | test lines / total lines changed |
| Active days | days with at least 1 commit |
| Feat/Fix/Refactor % | commit type breakdown |

---

## Steps 4-13: Analysis Passes

Read [analysis](references/analysis.md) and work through every pass in it: hourly commit distribution, work session detection, commit type breakdown, hotspot analysis, PR size distribution, focus score, per-contributor deep dive, week-over-week trends, streak tracking, and historical comparison against the last snapshot. Each pass names the flags to raise and the thresholds that trigger them.

---

## Step 14: Save Snapshot

Write the current metrics as JSON for future comparisons:

```bash
mkdir -p .hamster/retros
```

Write to `.hamster/retros/{YYYY-MM-DD}.json` with all computed metrics:
- commits, contributors, prs_merged, loc_added, loc_removed
- test_loc_ratio, active_days, commit_type_breakdown
- hotspots, pr_size_distribution, focus_score
- per_contributor stats, session data
- window_days, generated_at

---

## Step 15: Write Narrative

Produce a retrospective narrative (~1500-3000 words) with this structure:

1. **Tweetable Summary** — One sentence capturing the period
2. **Summary Table** — Metrics at a glance (from Step 3)
3. **Trends vs Last Retro** — Deltas with arrows (if history exists from Step 13)
4. **Time & Session Patterns** — When and how the team works (Steps 4-5)
5. **Shipping Velocity** — What got built, PR cadence (Steps 6, 8)
6. **Code Quality Signals** — Test discipline, churn, hotspots (Steps 6-7)
7. **Focus & Highlights** — Focus score, Ship of the Week (Step 9)
8. **Team Breakdown** — Per-person sections with praise and growth (Step 10)
9. **Top 3 Wins** — Celebrate specific accomplishments anchored in commits
10. **3 Things to Improve** — Actionable, specific, tied to data
11. **3 Habits for Next Week** — Forward-looking recommendations

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| `.hamster/` missing | Stop with message to initialize project |
| No commits in window | Report "no activity" and suggest a wider window |
| `gh` CLI not available | Skip PR data, note in output |
| No prior retro snapshots | Skip historical comparison, note this is the first retro |
| Date command incompatibility (macOS vs Linux) | Try both `date -v` and `date -d` syntax |

---

## Notes

- This command is read-only — no code changes, no git operations (except saving the snapshot JSON)
- The snapshot is saved to `.hamster/retros/` for trend tracking across retros
- Safe to run repeatedly; each run overwrites the same-date snapshot
- Best run weekly (7-day window) for actionable insights
- 14-day and 30-day windows are useful for sprint retros and monthly reviews
- The narrative is written for sharing with the team — paste it into Slack, a doc, or a standup
