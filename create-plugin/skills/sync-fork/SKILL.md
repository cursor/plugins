---
name: sync-fork
description: Use when this fork needs to be updated with new commits from upstream (cursor/plugins), when the fork is behind, or when preserving fork-only plugins and Copilot tooling during an upstream sync.
---

# Sync fork with upstream

## Overview

This repo is a fork of `cursor/plugins`. Shared plugins track upstream. Fork-only additions (custom plugins, Copilot ports, sync scripts) must survive every sync.

Sync by **merging** `upstream/main` into a sync branch and opening a PR. Do **not** rebase onto upstream and force-push `main`.

## Keeping up to date

1. Weekly workflow `.github/workflows/upstream-sync-alert.yml` opens or updates a single GitHub issue labeled `upstream-sync` when `main` is behind `cursor/plugins`.
2. When that issue appears (or you notice you are behind), run this skill.
3. Review and merge the sync PR.
4. The alert workflow closes the tracking issue on the next run once caught up (or close it manually after merge).
5. Retarget open custom PRs onto the updated `main` if needed.
6. If upstream Thermos changed and `copilot-plugins/` is present on `main`, re-run the Copilot sync script after the git merge.

## Workflow

### 1. Ensure remotes

```sh
git remote -v
# origin should be this fork (e.g. tomazb/cursor-plugins)
git remote add upstream https://github.com/cursor/plugins.git 2>/dev/null || \
  git remote set-url upstream https://github.com/cursor/plugins.git
git fetch upstream
git fetch origin
```

Always pin `upstream` to `https://github.com/cursor/plugins.git` (do not keep a stale URL).

### 2. Analyze (on `main`)

Compare `origin/main` to `upstream/main`, not whatever branch you currently have checked out:

```sh
git checkout main
git pull origin main
git log --oneline origin/main..upstream/main        # new upstream commits
git log --oneline upstream/main..origin/main        # our commits ahead of upstream
git diff --stat origin/main..upstream/main          # what changed upstream
```

If `origin/main..upstream/main` is empty, there is nothing to sync. Stop.

### 3. Snapshot protected paths (before merge)

Protected paths may be absent until custom work lands. Persist which exist **before** the merge; verification must fail if any of those disappear.

```sh
PROTECTED_PATHS=(
  cursor-rubber-duck
  copilot-plugins
  scripts/sync-copilot-plugin.mjs
  scripts/sync-thermos-copilot-plugin.mjs
  scripts/validate-copilot-plugin.mjs
  scripts/sync-thermos-copilot-plugin.test.mjs
  scripts/validate-copilot-plugin.test.mjs
  .github/workflows/copilot-plugin-sync.yml
)

: > /tmp/sync-fork-protected-present.txt
for p in "${PROTECTED_PATHS[@]}"; do
  if [ -e "$p" ]; then
    echo "$p" >> /tmp/sync-fork-protected-present.txt
    echo "present: $p"
  fi
done
```

Also treat marketplace/README mentions of those fork-only plugins as protected content to re-apply on conflict.

### 4. Sync branch

Create a branch from `main`. Never force-push `main`. Include a UTC timestamp so a retry for the same upstream tip does not collide:

```sh
SHORT=$(git rev-parse --short upstream/main)
STAMP=$(date -u +%Y%m%d%H%M)
git checkout main
git pull origin main
git checkout -b "branch/sync-upstream-${SHORT}-${STAMP}-d3b9"
```

### 5. Merge (not rebase)

```sh
git merge upstream/main
```

### 6. Resolve conflicts

**README.md** will often conflict:

- Start from **upstream’s** content (current plugin table).
- Re-apply fork-only rows/sections (e.g. `cursor-rubber-duck`, Copilot port notes).
- Do **not** keep “our” README wholesale — upstream plugin list changes must land.

**.cursor-plugin/marketplace.json**:

- Keep every upstream plugin entry.
- Re-add fork-only entries that were present before the merge.

**Shared plugin directories:** prefer upstream.

**Fork-only paths:** keep ours; never delete them to “match” upstream.

### 7. Upstream plugin churn

Compare root plugin directories (exclude infra: `.github`, `scripts`, `schemas`, `.cursor-plugin`, and protected fork-only paths).

**ADDED plugin:** ensure `<plugin-directory>/.cursor-plugin/plugin.json` exists (from upstream), add marketplace row, add README table row.

**REMOVED plugin:** remove marketplace row and README row; do not leave stale fork-only references for that slug.

**RENAMED plugin:** treat as remove old + add new.

Do **not** create `.claude-plugin/` manifests.

### 8. Verify

```sh
# Fail if any protected path that existed pre-merge is gone
while IFS= read -r p; do
  [ -z "$p" ] && continue
  if [ ! -e "$p" ]; then
    echo "ERROR: protected path missing after merge: $p" >&2
    exit 1
  fi
done < /tmp/sync-fork-protected-present.txt

# Schema/name checks for marketplace + per-plugin manifests only
# (does not verify protected-path preservation — that is the loop above)
node scripts/validate-plugins.mjs

git log --oneline -5
git diff upstream/main --stat
```

`git diff upstream/main --stat` should show only fork-only files plus intentional marketplace/README deltas (and any other deliberate fork-only tooling).

If Thermos under upstream changed and `copilot-plugins/` exists:

```sh
node scripts/sync-thermos-copilot-plugin.mjs
# or the shared sync entrypoint if that is what the repo uses
node scripts/validate-copilot-plugin.mjs copilot-plugins/thermos
```

### 9. Ship

Stage and commit any conflict resolutions (and churn updates) before pushing. A conflicted merge is unfinished until you commit:

```sh
git add -A
if [ -f .git/MERGE_HEAD ]; then
  git commit --no-edit
elif ! git diff --cached --quiet; then
  git commit -m "Sync with upstream cursor/plugins"
fi
git push -u origin HEAD
```

Open a PR into `main`. Do **not** `git push --force` to `main`.

## Key files

| File | Purpose |
|:-----|:--------|
| `.cursor-plugin/marketplace.json` | Must list upstream plugins + any fork-only plugins |
| `README.md` | Plugin table; merge upstream list with fork-only rows |
| `.github/workflows/upstream-sync-alert.yml` | Weekly behind-upstream issue alert |
| Fork-only paths above | Must survive sync when present |

## Common mistakes

- Taking “our” README.md wholesale instead of merging upstream’s plugin changes
- Dropping fork-only marketplace rows during conflict resolution
- Deleting protected paths that existed before the merge
- Analyzing / alerting from a non-`main` ref instead of `origin/main` vs `upstream/main`
- Syncing from an upstream branch other than `main`
- Pushing before committing resolved merge conflicts
- Rebase + force-push to `main` (breaks PR history and open custom branches)
- Creating `.claude-plugin/` files (not this fork’s custom layer)
