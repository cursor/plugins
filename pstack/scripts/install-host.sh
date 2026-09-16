#!/usr/bin/env bash
# Install a pstack host adapter into a skill discovery root.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./scripts/install-host.sh --host=<codex|claude-code|generic> --dest=<absolute-skill-root> [--mode=symlink|copy]

  --host    Target harness adapter
  --dest    Absolute directory where the host discovers skills (created if missing)
  --mode    symlink (default) or copy

Cursor needs no install via this script: use /add-plugin pstack.
USAGE
}

HOST=""
DEST=""
MODE="symlink"

for arg in "$@"; do
  case "$arg" in
    --host=*) HOST="${arg#*=}" ;;
    --dest=*) DEST="${arg#*=}" ;;
    --mode=*) MODE="${arg#*=}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$HOST" || -z "$DEST" ]]; then
  usage
  exit 2
fi

case "$HOST" in
  codex|claude-code|generic) ;;
  cursor)
    echo "cursor is native — use /add-plugin pstack" >&2
    exit 2
    ;;
  *)
    echo "unsupported host: $HOST" >&2
    exit 2
    ;;
esac

if [[ "$DEST" != /* ]]; then
  echo "--dest must be an absolute path" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PSTACK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ADAPTER="$PSTACK_ROOT/adapters/$HOST"
ENTRY_SRC="$ADAPTER/skills/poteto-mode"
ENTRY_DEST="$DEST/poteto-mode"

if [[ ! -f "$ADAPTER/HOST.md" ]]; then
  echo "missing adapter: $ADAPTER/HOST.md" >&2
  exit 1
fi
if [[ ! -f "$ENTRY_SRC/SKILL.md" ]]; then
  echo "missing entry skill: $ENTRY_SRC/SKILL.md" >&2
  exit 1
fi

mkdir -p "$DEST"

place() {
  local src="$1" dest="$2"
  rm -rf "$dest"
  if [[ "$MODE" == "copy" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp -R "$src" "$dest"
  else
    ln -s "$src" "$dest"
  fi
}

place "$ENTRY_SRC" "$ENTRY_DEST"
printf '%s\n' "$PSTACK_ROOT" > "$DEST/pstack-root"
# Convenience: HOST mapping next to the skill root for hosts that only scan one directory
rm -f "$DEST/pstack-HOST.md"
if [[ "$MODE" == "copy" ]]; then
  cp "$ADAPTER/HOST.md" "$DEST/pstack-HOST.md"
else
  ln -s "$ADAPTER/HOST.md" "$DEST/pstack-HOST.md"
fi

echo "installed host=$HOST mode=$MODE"
echo "  entry:  $ENTRY_DEST"
echo "  root:   $DEST/pstack-root -> $PSTACK_ROOT"
echo "  host:   $DEST/pstack-HOST.md"
echo "read $ADAPTER/HOST.md then skills/poteto-mode before the first task."
