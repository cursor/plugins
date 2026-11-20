#!/bin/sh
# usage: ./check.sh out/cand*.cfg        one summary line per config
# For each cfg: verdict, distinct states, length of the counterexample trace.
for cfg in "$@"; do
  log=$(./tlc.sh "$cfg" 2>&1)
  verdict=$(printf '%s\n' "$log" | sed -n 's/^Error: \(Invariant [A-Za-z]* is violated\)\..*/\1/p; s/^Error: \(Temporal properties were violated\)\..*/\1/p' | head -1)
  [ -n "$verdict" ] || verdict=$(printf '%s\n' "$log" | grep -q 'No error has been found' && echo 'ok' || echo 'TLC ERROR')
  states=$(printf '%s\n' "$log" | sed -n 's/.* \([0-9]*\) distinct states found.*/\1/p' | tail -1)
  case "$cfg" in *reach*)   # the witness run: a violation is the good news
    case "$verdict" in *violated*) verdict="mixed win REACHABLE (witness)";; ok) verdict="mixed win UNREACHABLE";; esac;;
  esac
  steps=$(printf '%s\n' "$log" | grep -c '^State [0-9]')
  printf '%-22s %-36s distinct=%-4s trace_states=%s\n' "$(basename "$cfg")" "$verdict" "${states:--}" "$steps"
done
