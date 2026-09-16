#!/usr/bin/env bash
# Prove adapter contract + install dry-run. Not a live host Feature journey.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PSTACK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EVIDENCE="$PSTACK_ROOT/adapters/evidence/check-host-adapters"
rm -rf "$EVIDENCE"
mkdir -p "$EVIDENCE"

fail=0
require() {
  local f="$1"
  if [[ -f "$f" ]]; then
    echo "ok $f" | tee -a "$EVIDENCE/layout.txt"
  else
    echo "MISSING $f" | tee -a "$EVIDENCE/layout.txt"
    fail=1
  fi
}

require "$PSTACK_ROOT/adapters/README.md"
for h in cursor codex claude-code generic; do
  require "$PSTACK_ROOT/adapters/$h/HOST.md"
done
for h in codex claude-code generic; do
  require "$PSTACK_ROOT/adapters/$h/skills/poteto-mode/SKILL.md"
done
require "$PSTACK_ROOT/scripts/install-host.sh"
require "$PSTACK_ROOT/docs/guide/11-other-hosts.md"

# mapping tables must mention gaps / inherit
for h in codex claude-code generic; do
  if grep -qiE 'do not pass Cursor model|Inherit|report missing' "$PSTACK_ROOT/adapters/$h/HOST.md"; then
    echo "ok mapping-discipline $h" | tee -a "$EVIDENCE/layout.txt"
  else
    echo "WEAK mapping-discipline $h" | tee -a "$EVIDENCE/layout.txt"
    fail=1
  fi
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for h in codex claude-code generic; do
  dest="$TMP/$h-skills"
  mkdir -p "$dest"
  if "$PSTACK_ROOT/scripts/install-host.sh" --host="$h" --dest="$dest" --mode=symlink \
      >"$EVIDENCE/install-$h.stdout.txt" 2>"$EVIDENCE/install-$h.stderr.txt"; then
    if [[ -e "$dest/poteto-mode/SKILL.md" && -f "$dest/pstack-root" && -e "$dest/pstack-HOST.md" ]]; then
      root=$(cat "$dest/pstack-root")
      if [[ "$root" == "$PSTACK_ROOT" ]]; then
        echo "ok install-dry-run $h" | tee -a "$EVIDENCE/layout.txt"
      else
        echo "BAD pstack-root $h ($root)" | tee -a "$EVIDENCE/layout.txt"
        fail=1
      fi
    else
      echo "BAD install layout $h" | tee -a "$EVIDENCE/layout.txt"
      fail=1
    fi
  else
    echo "FAIL install $h" | tee -a "$EVIDENCE/layout.txt"
    fail=1
  fi
done

cat > "$EVIDENCE/PROOF.md" << PROOF
# Host adapter check

Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
pstack root: $PSTACK_ROOT

## What this proves
- Required adapter files exist.
- HOST mappings mention inherit/gap discipline.
- \`install-host.sh\` dry-runs for codex, claude-code, and generic into a temp skill root.

## What this does not prove
- A live Feature journey inside Codex or Claude Code.
- Multi-model arena/swarm parity.
- Companion cursor-team-kit availability.

See \`layout.txt\` and \`install-*.stdout.txt\`.
PROOF

if [[ "$fail" -ne 0 ]]; then
  echo "FAILED — see $EVIDENCE" >&2
  exit 1
fi
echo "PASSED — evidence at $EVIDENCE"
