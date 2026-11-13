#!/bin/sh
# Whole loop, from a clean shell. Needs swipl on PATH (or SWIPL=...) and TLA_HOME pointing at tla2tools.jar.
SWIPL="${SWIPL:-swipl}"
command -v "$SWIPL" >/dev/null 2>&1 || { echo "swipl not found: install SWI-Prolog or set SWIPL=/path/to/swipl" >&2; exit 2; }
[ -n "$TLA_HOME" ] && [ -f "$TLA_HOME/tla2tools.jar" ] || { echo "set TLA_HOME to the folder with tla2tools.jar" >&2; exit 2; }
run() { echo; echo "\$ $*"; "$@"; }
rm -rf out

echo "### 1. Prolog proposes"
run "$SWIPL" design.pl -- search

echo; echo "### 2. TLC checks the survivors"
run ./check.sh out/cand1.cfg out/cand1-reach.cfg
echo; echo "# all 23 survivors"
run ./check.sh $(ls out/cand?.cfg out/cand??.cfg | sort -V)

echo; echo "### 3. A counterexample on a survivor, then on a deliberately bad layout"
run ./path.sh out/cand6.cfg
run ./path.sh out/bad.cfg
run ./check.sh out/bad.cfg out/bad-reach.cfg
echo; echo "# the witness that a mixed win exists, on the top-ranked layout"
run ./path.sh out/cand1-reach.cfg

echo; echo "### 4. The counterexample becomes a constraint; propose again"
run "$SWIPL" design.pl -- fix
run ./check.sh $(ls out/fixed?.cfg | sort -V)

echo; echo "### 5. Do the two models agree?"
echo "# Abil lines of the 6 survivors that passed TLC vs. the 6 layouts Prolog proposes with strand_free"
grep -h Abil out/cand1.cfg out/cand2.cfg out/cand3.cfg out/cand4.cfg out/cand5.cfg out/cand23.cfg | sort > out/passed.txt
grep -h Abil out/fixed1.cfg out/fixed2.cfg out/fixed3.cfg out/fixed4.cfg out/fixed5.cfg out/fixed6.cfg | sort > out/proposed.txt
if diff out/passed.txt out/proposed.txt > /dev/null; then echo "identical (12 lines each)"; else echo "DIFFERENT"; fi
