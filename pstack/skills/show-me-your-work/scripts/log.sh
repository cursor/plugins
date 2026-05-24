#!/usr/bin/env bash
# Append a well-formed row to a show-me-your-work decision log (TSV).
# Usage: log.sh <logfile> <phase> <decision> <why> <evidence> <result>
set -euo pipefail

if [ "$#" -ne 6 ]; then
	printf 'usage: log.sh <logfile> <phase> <decision> <why> <evidence> <result>\n' >&2
	exit 1
fi

logfile="$1"
shift

if [ ! -f "$logfile" ]; then
	printf 'ts\tphase\tdecision\twhy\tevidence\tresult\n' > "$logfile"
fi

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
clean() { printf '%s' "$1" | tr '\t\n' '  '; }
printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
	"$ts" "$(clean "$1")" "$(clean "$2")" "$(clean "$3")" "$(clean "$4")" "$(clean "$5")" \
	>> "$logfile"
