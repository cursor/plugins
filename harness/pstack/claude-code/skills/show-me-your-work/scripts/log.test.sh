#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

(
	cd "$work"
	"$here/log.sh" -decisions.tsv plan choice why evidence result
)

test -f "$work/-decisions.tsv"
test "$(wc -l < "$work/-decisions.tsv" | tr -d ' ')" -eq 2
