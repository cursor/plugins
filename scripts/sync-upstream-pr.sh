#!/usr/bin/env bash
# Sync upstream/main into the fork through a pull request. Run from any branch.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
# Use the same Node major as CI when it is installed through Homebrew.
if command -v brew >/dev/null && node_prefix=$(brew --prefix node@22) && [[ -x "$node_prefix/bin/node" ]]; then
  export PATH="$node_prefix/bin:$PATH"
fi

# gh can default to the parent repository when run inside a fork.
origin_url=$(git remote get-url origin)
case "$origin_url" in
  https://github.com/*) repo=${origin_url#https://github.com/} ;;
  git@github.com:*) repo=${origin_url#git@github.com:} ;;
  ssh://git@github.com/*) repo=${origin_url#ssh://git@github.com/} ;;
  *) echo "Expected origin to point to a GitHub fork: $origin_url" >&2; exit 1 ;;
esac
repo=${repo%.git}
git fetch origin main
git fetch upstream main
base=$(git rev-parse origin/main)
target=$(git rev-parse upstream/main)
branch="sync/upstream-$(git rev-parse --short "$target")"

if git merge-base --is-ancestor "$target" "$base"; then
  echo "origin/main already contains upstream/main at $target"
  exit 0
fi

open_pr() {
  gh pr list --repo "$repo" --base main --head "$branch" --state open \
    --json url,isCrossRepository --jq 'map(select(.isCrossRepository == false))[0].url // empty'
}

url=$(open_pr)
if [[ -n "$url" ]]; then
  echo "$url"
  exit 0
fi

# Resume a previous push if PR creation was interrupted.
remote_ref=$(git ls-remote --heads origin "refs/heads/$branch")
if [[ -n "$remote_ref" ]]; then
  git fetch origin "refs/heads/$branch"
  start=$(git rev-parse FETCH_HEAD)
  if ! git merge-base --is-ancestor "$target" "$start"; then
    echo "Existing origin/$branch does not contain $target. Inspect it before retrying." >&2
    exit 1
  fi
else
  start=$base
fi

scratch=$(mktemp -d)
cleanup() {
  if [[ -e "$scratch/tree/.git" ]]; then git worktree remove --force "$scratch/tree" || return; fi
  rm -rf "$scratch"
}
trap cleanup EXIT
git worktree add --detach "$scratch/tree" "$start"
if [[ "$start" != "$base" ]]; then
  git -C "$scratch/tree" merge --no-edit "$base"
fi
node "$scratch/tree/scripts/sync-upstream.mjs" --no-install
if [[ "$(git rev-parse upstream/main)" != "$target" ]]; then
  echo "upstream/main advanced during sync. Rerun to use the new revision." >&2
  exit 1
fi
git -C "$scratch/tree" push origin "HEAD:refs/heads/$branch"
cat > "$scratch/body.md" <<EOF
Sync upstream/main at $target and regenerate the pstack packages.
EOF
if ! gh pr create --repo "$repo" --base main --head "$branch" \
    --title "Sync upstream/main at ${target:0:8}" --body-file "$scratch/body.md"; then
  # Another invocation may have opened the same PR after the initial lookup.
  url=$(open_pr)
  [[ -n "$url" ]] || exit 1
  echo "$url"
fi
