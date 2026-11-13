#!/bin/sh
# usage: ./tlc.sh BossPhase.cfg   (needs TLA_HOME = the folder with tla2tools.jar, and java 11+ on PATH or JAVA=...)
[ -n "$TLA_HOME" ] && [ -f "$TLA_HOME/tla2tools.jar" ] || { echo "set TLA_HOME to the folder with tla2tools.jar" >&2; exit 2; }
JAVA="${JAVA:-java}"
"$JAVA" -XX:+UseParallelGC -cp "$TLA_HOME/tla2tools.jar" tlc2.TLC -config "$1" -workers auto -noGenerateSpecTE -metadir "${TMPDIR:-/tmp}/tlc-states-$$" BossPhase.tla
status=$?; rm -rf "${TMPDIR:-/tmp}/tlc-states-$$"; exit $status
