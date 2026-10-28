#!/usr/bin/env bash
# Remove confirmed worktrees only when they still exist and are still clean.
# Re-lists via `git worktree list --porcelain` so a stale audit cannot delete a
# path that went dirty or appeared after the snapshot. Never invents paths.
#
# Usage: worktree-remove.sh [--dry-run] [-C <repo>] <worktree-path>...
set -u

dry=0
repo=""
while [ $# -gt 0 ]; do
	case "$1" in
	--dry-run) dry=1; shift ;;
	-C) [ $# -ge 2 ] || { echo "error: -C needs a path" >&2; exit 2; }; repo="$2"; shift 2 ;;
	-h|--help) sed -n '2,/^set -u/p' "$0" | sed '$d; s/^# \{0,1\}//'; exit 0 ;;
	--) shift; break ;;
	-*) echo "error: unknown option: $1" >&2; exit 2 ;;
	*) break ;;
	esac
done

[ $# -ge 1 ] || { echo "usage: worktree-remove.sh [--dry-run] [-C <repo>] <worktree-path>..." >&2; exit 2; }

# Always operate from the primary worktree. `rev-parse --show-toplevel` on a
# linked checkout returns that checkout, and `git worktree remove` refuses to
# delete the current working directory.
seed="${repo:-$1}"
[ -n "${repo:-}" ] || seed=$(git rev-parse --show-toplevel 2>/dev/null || true)
[ -n "$seed" ] || seed=$1
repo=$(git -C "$seed" worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "$repo" ] || { echo "error: not a git repo; pass -C <repo>" >&2; exit 1; }
cd "$repo" || exit 1
git rev-parse --git-dir >/dev/null 2>&1 || { echo "error: not a git repo: $repo" >&2; exit 1; }

live=$(mktemp)
trap 'rm -f "$live"' EXIT
git worktree list --porcelain | awk '/^worktree /{print $2}' > "$live"

main_wt=$(head -1 "$live")
ok=0
refused=0
skipped=0

for raw in "$@"; do
	wt=$(cd "$raw" 2>/dev/null && pwd -P || printf '%s' "$raw")
	if [ "$wt" = "$main_wt" ]; then
		echo "REFUSE main worktree: $wt" >&2
		refused=$((refused + 1))
		continue
	fi
	if ! grep -Fxq "$wt" "$live"; then
		# Also try the raw path in case pwd -P rewrote a missing dir.
		if ! grep -Fxq "$raw" "$live"; then
			echo "SKIP not in live list: $raw" >&2
			skipped=$((skipped + 1))
			continue
		fi
		wt=$raw
	fi
	if [ ! -d "$wt" ]; then
		echo "SKIP missing dir: $wt" >&2
		skipped=$((skipped + 1))
		continue
	fi
	porcelain=$(git -C "$wt" status --porcelain 2>/dev/null || true)
	if [ -n "$porcelain" ]; then
		echo "REFUSE dirty (status no longer clean): $wt" >&2
		printf '%s\n' "$porcelain" | sed 's/^/  /' >&2
		refused=$((refused + 1))
		continue
	fi
	if [ "$dry" -eq 1 ]; then
		echo "DRY-RUN remove: $wt"
		ok=$((ok + 1))
		continue
	fi
	if git worktree remove --force "$wt"; then
		echo "REMOVED $wt"
		ok=$((ok + 1))
	else
		echo "FAIL git worktree remove: $wt" >&2
		refused=$((refused + 1))
	fi
done

if [ "$dry" -eq 0 ]; then
	git worktree prune
fi

echo "summary removed_or_dry=$ok refused=$refused skipped=$skipped"
[ "$refused" -eq 0 ]
