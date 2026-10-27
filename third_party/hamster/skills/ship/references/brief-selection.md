# Account Resolution, Brief Selection, and Scheduling

Canonical source: `skills/ship/references/brief-selection.md`. It is copied byte-for-byte into plan-hamster and resume-hamster because every skill directory is self-contained; `scripts/validate-plugin.mjs` rejects divergent copies. Edit the canonical file and copy it to both consumers. All three skills run Account Resolution before their own setup; plan runs Brief Selection and Scheduling, while resume uses Brief Selection for an explicit argument and re-enters Scheduling.

## Account Resolution

`HAMSTER_ACCOUNT_ID` is an API account UUID, **not** a directory name. Resolve the filesystem `$account` from the repository projection's `.hamster/.state.json` `account_slug`, checking its `account_id` against the environment when set. Do not change or unset `HAMSTER_ACCOUNT_ID` to make a filesystem lookup work.

Run this from the user's repository after readiness succeeds. It reads `.hamster/.state.json` with `python3` instead of matching JSON as text, and stops with `ACCOUNT_UNRESOLVED` when `python3` is missing.

```bash
command -v python3 >/dev/null 2>&1 || { echo "ACCOUNT_UNRESOLVED: python3 is required to read .hamster/.state.json; install python3 and retry"; exit 1; }
account=$(python3 - <<'PY'
import json
import os
import re
import sys
from pathlib import Path

root = Path(".hamster")
try:
    state = json.loads((root / ".state.json").read_text())
    account = state["account_slug"]
    state_id = state["account_id"]
except Exception as error:
    sys.exit("ACCOUNT_UNRESOLVED: cannot read .hamster/.state.json (" + str(error) + "); run hamster sync in this repository")
env_id = os.environ.get("HAMSTER_ACCOUNT_ID", "")
if env_id not in ("", state_id):
    sys.exit("ACCOUNT_UNRESOLVED: HAMSTER_ACCOUNT_ID (" + env_id + ") is not this projection's account_id (" + str(state_id) + "); set that UUID, never a slug, or switch teams with the CLI and re-sync")
if not re.fullmatch(r"[A-Za-z0-9_-]+", account) or not (root / account / "briefs").is_dir():
    sys.exit("ACCOUNT_UNRESOLVED: .hamster/.state.json names no synced account directory; run hamster sync in this repository")
print(account)
PY
) || exit 1
printf 'ACCOUNT_RESOLVED: %s\n' "$account"
```

`ACCOUNT_UNRESOLVED` → stop before starting a watcher, selecting a brief, or updating status. For a mismatched team, ask which team the user intends, then run `hamster team switch --account-id <uuid>` (it clears the previous team's synced data and re-syncs) followed by `hamster sync` in this repository before retrying. If an environment override is needed, it must be that team's **UUID**, never its slug. Missing or invalid state requires re-sync; never guess an account directory by scanning `.hamster/`.

Remember the literal `ACCOUNT_RESOLVED` value as the filesystem `$account`. Each Bash call is a fresh shell: assign that value again, shell-quoted, before the calling skill's setup and every selection/scheduling block below. Do not re-derive it from `HAMSTER_ACCOUNT_ID`.

---

## Brief Selection

### If argument provided

First resolve URL/UUID/slug; a `FOUND` result takes precedence over title matching:

```bash
arg="$ARGUMENTS"; arg="${arg%/}"
if echo "$arg" | grep -qE '^https?://'; then
  identifier=$(echo "$arg" | sed -E 's|^https?://[^/]+/home/[^/]+/briefs/([^/]+)(/tasks)?$|\1|')
else identifier="$arg"; fi
if echo "$identifier" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
  slug=""
  for brief_dir in .hamster/${account}/briefs/*/; do
    bf="${brief_dir}brief.md"; [ -f "$bf" ] || continue
    eid=$(awk '
      /^---$/ { n++; if (n == 2) exit; next }
      n == 1 && match($0, /^entity_id:/) {
        v = substr($0, RLENGTH + 1); sub(/^[ \t]+/, "", v)
        sub(/^"/, "", v); sub(/"$/, "", v); gsub(/\\"/, "\"", v)
        print v; exit
      }' "$bf")
    [ "$eid" = "$identifier" ] && { slug=$(basename "$brief_dir"); break; }
  done
else slug="$identifier"; fi
if [ -f ".hamster/${account}/briefs/${slug}/brief.md" ]; then echo "FOUND: $slug"
else echo "NOT_FOUND: $identifier"; ls -d .hamster/${account}/briefs/*"${slug}"*/ 2>/dev/null | head -5; fi
```

If `NOT_FOUND`, do not ask yet. Resolve the supplied brief name against **all synced briefs** in `.hamster/${account}/briefs/*/brief.md`, reading their frontmatter `title` and directory slug:

1. Normalize the supplied name and titles by trimming whitespace and trailing punctuation, removing a leading `the ` and a trailing ` brief` when present, and comparing case-insensitively.
2. Compare the normalized name with normalized full titles first. If none match, extract each **short title** from its original title before the earliest `:`, ` — `, or ` - ` separator (or use the whole title if there is no separator), normalize that short title, and compare for equality.
3. At the first tier with matches, select it without asking if exactly one brief matches, remembering its directory slug as `$slug`. If two or more match, ask the user to choose from those candidates; do not use the other tier to break the tie. If neither tier matches, show the closest available titles/slugs and ask. An empty normalized name never resolves automatically. Other than an exact short-title match, never auto-select a title or slug prefix or another partial match.

### If no argument

List actionable briefs and ask the user to pick:

```bash
briefs_dir=".hamster/${account}/briefs"
[ -d "$briefs_dir" ] || { echo "ACCOUNT_UNRESOLVED: $briefs_dir does not exist; re-run Account Resolution and use the literal slug it prints"; exit 1; }
for brief_dir in "${briefs_dir}"/*/; do
  [ -d "$brief_dir" ] || continue
  slug=$(basename "$brief_dir"); brief_file="${brief_dir}brief.md"; tasks_dir="${brief_dir}tasks"
  [ -f "$brief_file" ] && [ -d "$tasks_dir" ] || continue
  meta=$(awk '
    /^---$/ { n++; if (n == 2) { print s "|" t; exit } next }
    n == 1 && match($0, /^[a-z_]+:/) {
      k = substr($0, 1, RLENGTH - 1); v = substr($0, RLENGTH + 1); sub(/^[ \t]+/, "", v)
      sub(/^"/, "", v); sub(/"$/, "", v); gsub(/\\"/, "\"", v)
      if (k == "status") s = v; else if (k == "title") t = v
    }' "$brief_file")
  brief_status="${meta%%|*}"; title="${meta#*|}"
  case "$brief_status" in aligned|delivering|refining) ;; *) continue ;; esac
  total=$(ls "$tasks_dir"/*.md 2>/dev/null | wc -l | tr -d ' '); [ "$total" -eq 0 ] && continue
  done_count=$(grep -l '^status: "done"' "$tasks_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
  echo "${brief_status}|${slug}|${done_count}/${total}|${title}"
done | sort -t'|' -k1,1
```

Output is `status|slug|done/total|title`. Title is last so a `|` inside it cannot shift the machine-read fields.

---

## Scheduling (inline — no planner agent)

The plan already exists; this step only organizes it into waves. Parse all task frontmatter in one call:

```bash
tasks_dir=".hamster/${account}/briefs/${slug}/tasks"
for f in "$tasks_dir"/*.md; do
  [ -f "$f" ] || continue
  awk -v file="$f" '
    /^---$/ { n++; if (n == 2) { print v["display_id"] "|" v["entity_id"] "|" v["parent_task_id"] "|" v["status"] "|" file "|" v["title"]; exit } next }
    n == 1 && match($0, /^[a-z_]+:/) {
      k = substr($0, 1, RLENGTH - 1); s = substr($0, RLENGTH + 1); sub(/^[ \t]+/, "", s)
      sub(/^"/, "", s); sub(/"$/, "", s); gsub(/\\"/, "\"", s)
      v[k] = s
    }' "$f"
done | sort -t'|' -k1,1
```

Each row is `HAM-123|entity-uuid|parent-uuid|status|path|Title` — the awk strips only the outer quotes of a frontmatter value, so a title containing a quote survives, and title sits last so a `|` inside it cannot shift the earlier fields.

1. **Build the tree**: rows with empty `parent_task_id` are parents; rows whose `parent_task_id` matches a parent's `entity_id` are its subtasks. A parent with no subtasks is standalone.
2. **Filter**: skip parents whose entire subtree is `done`. Parents with `in_progress` tasks go in the earliest wave.
3. **Detect overlap** between remaining parents. Extract concrete mentions (file paths, PascalCase components, module names) from parent task bodies in one call:
   ```bash
   for f in {parent-task-files}; do
     echo "== $(basename "$f")"
     grep -ohE '[A-Za-z0-9_./-]+\.[a-z]{2,4}|[A-Z][a-z]+[A-Z][A-Za-z]+' "$f" | sort -u | head -20
   done
   ```
   Two parents sharing 2+ concrete mentions → conflict → serialize into different waves. Judgment call: titles clearly touching the same feature area also conflict. Do NOT search the codebase for this — task text only.
4. **Group greedily into waves**: Wave 1 = all mutually non-conflicting parents; conflicting parents fall to later waves.

Show the user a compact schedule and ask the user once to confirm ("Execute this schedule?" / "Modify" / "Cancel"):

```
{brief title} — {n} parents, {m} subtasks remaining ({d} done)

Wave 1 (parallel): HAM-100 {title}, HAM-300 {title}
Wave 2:            HAM-200 {title}  (conflicts with HAM-100: both touch auth/UserService)
```
