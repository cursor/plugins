#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
	printf 'usage: %s <bun-1.0.7> <current-bun>\n' "$0" >&2
	exit 2
fi

scripts_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/poteto-bootstrap.XXXXXX")
trap 'rm -rf "$work_dir"' EXIT

if [ -f "$scripts_dir/bun.lockb" ]; then
	lockfile=bun.lockb
elif [ -f "$scripts_dir/bun.lock" ]; then
	lockfile=bun.lock
else
	printf 'missing Bun lockfile in %s\n' "$scripts_dir" >&2
	exit 1
fi

verify_runtime() {
	runtime=$1
	label=$2
	fixture="$work_dir/$label"
	cache="$work_dir/$label-cache"
	store="$work_dir/$label-store"

	mkdir -p "$fixture/orch"
	cp "$scripts_dir/bootstrap.ts" "$scripts_dir/package.json" \
		"$scripts_dir/$lockfile" "$fixture/"
	cp -R "$scripts_dir/orch/." "$fixture/orch/"

	version=$("$runtime" --version)
	printf 'testing %s with Bun %s\n' "$label" "$version"
	BUN_INSTALL_CACHE_DIR="$cache" ORCH_STORE="$store" \
		"$runtime" "$fixture/orch/orch.ts" init

	install_key="$fixture/node_modules/.poteto-mode-tools-install-key"
	test -f "$fixture/node_modules/commander/package.json"
	test -f "$install_key"
	cmp -s "$scripts_dir/$lockfile" "$fixture/$lockfile"

	chmod a-w "$install_key"
	BUN_INSTALL_CACHE_DIR="$cache" ORCH_STORE="$store" \
		"$runtime" "$fixture/orch/orch.ts" init
	chmod u+w "$install_key"
	cmp -s "$scripts_dir/$lockfile" "$fixture/$lockfile"
	printf 'verified %s clean install and repeated run\n' "$label"
}

verify_runtime "$1" "bun-1.0.7"
verify_runtime "$2" "current-bun"
