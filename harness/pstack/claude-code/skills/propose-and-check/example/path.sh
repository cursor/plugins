#!/bin/sh
# usage: ./path.sh out/bad.cfg      the counterexample as one line per step
./tlc.sh "$1" 2>&1 | sed -n 's/^State \([0-9]*\): <\([A-Za-z]*\(([0-9])\)\{0,1\}\).*/  \1. \2/p; s/^State \([0-9]*\): <Initial predicate>/  \1. start/p'
