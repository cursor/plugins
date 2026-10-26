#!/usr/bin/env bash
# List the rows a decision log still leaves open: for each decision, its latest
# row, kept only when that row's result is exactly `open`. Read-only, never
# writes, and prints nothing when nothing is open.
#
# Usage: open.sh [-h|--help] <logfile>
#   Prints the header row plus the latest row of each decision still open, in
#   the order the decisions first appear, so `open.sh decisions.tsv |
#   column -s$'\t' -t` renders a table. Exits 2 on a usage or file error.
#
# A later row supersedes an earlier one when it repeats the same `phase` and
# `decision` cells, which is how the skill says a corrected call is logged. It
# cannot judge a row that resolves an earlier one in prose, so read what it
# prints and drop anything the log already settled.
set -u

# shortcut: matching is on the exact `open` cell, so `open, waiting on owner`
# does not count. Widen it if the skill ever adopts compound open results.

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
	sed -n '2,/^set -u/p' "$0" | sed '$d; s/^# \{0,1\}//'
	exit 0
fi
if [ "$#" -ne 1 ]; then
	printf 'usage: open.sh <logfile>\n' >&2
	exit 2
fi
logfile="$1"
if [ ! -f "$logfile" ]; then
	printf 'error: not a log file: %s\n' "$logfile" >&2
	exit 2
fi

awk '
function trim(s) {
	gsub(/^ +| +$/, "", s)
	return s
}
{
	rec = $0
	sub(/\r$/, "", rec)
	if (rec == "") next
	# A row is one physical line with six tab-separated cells. A row that is not
	# one, such as a hand-made printf that let a cell hold a newline, is counted
	# so the reader fixes it instead of reading silence as "nothing open".
	cells = split(rec, c, "\t")
	if (cells == 6 && c[1] == "ts" && c[2] == "phase") next
	if (cells != 6) {
		skipped++
		next
	}
	phase = trim(c[2])
	decision = trim(c[3])
	result = trim(c[6])
	if (phase == "" || decision == "") {
		skipped++
		next
	}
	key = phase SUBSEP decision
	if (!(key in last)) order[++rows] = key
	last[key] = rec
	open[key] = (result == "open")
}
END {
	printed = 0
	for (i = 1; i <= rows; i++) {
		key = order[i]
		if (!open[key]) continue
		if (!printed++) print "ts\tphase\tdecision\twhy\tevidence\tresult"
		print last[key]
	}
	if (skipped) printf "%d lines are not rows and were skipped: fix them with log.sh\n", skipped > "/dev/stderr"
}
' "$logfile"
