#!/usr/bin/env bash
# tree-stamp.sh — one line naming the exact working tree a check ran on, so a
# reviewer can tell whether the writer's check log still describes the code
# under review without re-running the checks (SKILL.md §6).
#
# The stamp is a hash of content only: the path and blob id of every file in
# the work tree that git tracks or would track (untracked, non-ignored files
# included). Ignored files (build output, caches) do not count, and neither do
# HEAD, the index, or commits — running the checks and then committing keeps
# the stamp. Nothing is written to the repository.
#
# Usage: tree-stamp.sh [repo-dir]
# Output: tree=<12 hex>
# Exit: 0 = stamp printed, 64 = not a git work tree.
set -uo pipefail

dir="${1:-.}"
git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "usage: tree-stamp.sh [repo-dir] (not a git work tree: $dir)" >&2; exit 64; }
cd "$(git -C "$dir" rev-parse --show-toplevel)" || exit 64

files="$(mktemp)"; trap 'rm -f "$files"' EXIT
sum="$(
  git ls-files -z --cached --others --exclude-standard | sort -zu | while IFS= read -r -d '' f; do
    if [ -L "$f" ]; then printf 'link %s %s\n' "$(readlink "$f")" "$f" >&3   # the link itself, not its target
    elif [ -f "$f" ]; then printf '%s\n' "$f"                              # tracked but deleted: absence is the change
    fi
  done 3>&1 >"$files"
  git hash-object --no-filters --stdin-paths <"$files" | paste -d' ' - "$files"
)"
echo "tree=$(printf '%s\n' "$sum" | sort | shasum | cut -c1-12)"
