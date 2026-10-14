#!/usr/bin/env bash
# Install pstack into a project for whichever agent host it uses.
#   ./install.sh                 detect the host, install into the current directory
#   ./install.sh --host codex    force a host
#   ./install.sh --target DIR    install somewhere else
#   ./install.sh --user          install into the host's user-level config instead
#   ./install.sh --list          show what would be installed, change nothing
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST=""; TARGET="$PWD"; DRY=0; USERLEVEL=0

while [ $# -gt 0 ]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --user) USERLEVEL=1; shift ;;
    --list|--dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# Project markers beat user-level ones: a repo that carries .codex/ wants the
# Codex build even on a machine where ~/.claude exists.
detect_host() {
  local found=""
  [ -d "$TARGET/.claude" ] || [ -f "$TARGET/CLAUDE.md" ] && found="$found claude"
  [ -d "$TARGET/.codex" ] || [ -d "$TARGET/.agents" ] || [ -f "$TARGET/AGENTS.md" ] && found="$found codex"
  [ -d "$TARGET/.github" ] && found="$found copilot"
  [ -d "$TARGET/.cursor" ] && found="$found cursor"
  if [ -z "$found" ]; then
    [ -d "$HOME/.claude" ] && found="$found claude"
    [ -d "$HOME/.codex" ] && found="$found codex"
    [ -d "$HOME/.cursor" ] && found="$found cursor"
    [ -n "$found" ] && echo "no project markers; detected from your user config" >&2
  fi
  set -- $found
  case $# in
    0) echo "no host detected, using the portable build. pass --host to choose one." >&2; echo generic ;;
    1) echo "$1" ;;
    *) echo "several hosts detected:$found. using $1. pass --host to choose another." >&2; echo "$1" ;;
  esac
}

[ -n "$HOST" ] || HOST="$(detect_host)"
case "$HOST" in
  claude-code) HOST=claude ;;
  claude|codex|copilot|cursor|generic) ;;
  *) echo "unknown host '$HOST'. one of: claude codex copilot cursor generic" >&2; exit 2 ;;
esac

SRC="$ROOT/dist/$HOST"
[ -d "$SRC" ] || { echo "dist/$HOST missing. run: node build/build.mjs" >&2; exit 1; }

# The guide and automation pack are top-level, generically-named directories.
# Installing them into a real $HOME would merge with the user's own ~/docs.
if [ "$USERLEVEL" = 1 ]; then
  SKIP_SHARED=1
fi
SKIP_SHARED="${SKIP_SHARED:-0}"

if [ "$USERLEVEL" = 1 ]; then
  case "$HOST" in
    claude) TARGET="$HOME" ;;
    codex)  TARGET="$HOME" ;;
    cursor) TARGET="$HOME/.cursor" ;;
    *) echo "--user is not meaningful for $HOST; installing into $TARGET" >&2 ;;
  esac
fi

SKILLDIR_HINT="$HOST"
echo "host:   $HOST"
echo "source: dist/$HOST"
echo "target: $TARGET"
echo

if [ "$DRY" = 1 ]; then
  echo "would install:"
  (cd "$SRC" && find . -type f | sed 's|^\./|  |' | sort | head -40)
  n=$(cd "$SRC" && find . -type f | wc -l)
  echo "  ... $n files total"
  exit 0
fi

# Never clobber an existing always-on instructions file. Append the pstack block instead.
merge_memory() {
  local rel="$1"
  local src="$SRC/$rel"
  local dst="$TARGET/$rel"
  [ -f "$src" ] || return 0
  if [ -f "$dst" ]; then
    if grep -q 'pstack:mode:start' "$dst"; then
      echo "  kept    $rel (pstack block already present)"
    else
      printf '\n' >> "$dst"; cat "$src" >> "$dst"
      echo "  merged  $rel (appended, your content untouched)"
    fi
    return 0
  fi
  mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"
  echo "  created $rel"
}

MEM=""
case "$HOST" in
  claude) MEM="CLAUDE.md" ;;
  codex) MEM="AGENTS.md" ;;
  copilot) MEM=".github/copilot-instructions.md" ;;
  cursor) MEM=".cursor/rules/pstack.mdc" ;;
  generic) MEM="pstack/AGENTS.md" ;;
esac

mkdir -p "$TARGET"

# tar overwrites by default. Back up anything the user already had at a path we
# are about to write, so a --user install can never silently eat a hand-written
# skill that happens to share a generic name (how, why, tdd, ...).
backup="$TARGET/.pstack/backup-$(date +%Y%m%d-%H%M%S)"
clobbered=0
while IFS= read -r rel; do
  [ -f "$TARGET/$rel" ] || continue
  cmp -s "$SRC/$rel" "$TARGET/$rel" && continue
  mkdir -p "$backup/$(dirname "$rel")"
  cp -p "$TARGET/$rel" "$backup/$rel"
  clobbered=$((clobbered + 1))
done <<EOT
$(cd "$SRC" && find . -type f ! -path "./INSTALL.md" ${MEM:+! -path "./$MEM"} | { [ "$SKIP_SHARED" = 1 ] && grep -Ev '^\./(docs|automations|assets)/' || cat; } | sed 's|^\./||')
EOT
if [ "$clobbered" -gt 0 ]; then
  echo "  backed up $clobbered pre-existing file(s) to ${backup#$TARGET/}"
else
  rm -rf "$backup" 2>/dev/null || true
fi

# A glob held in a variable is expanded by this shell against the current
# directory before find ever sees it, so filter the file list instead.
shared_re='^\./(docs|automations|assets)/'
if [ "$SKIP_SHARED" = 1 ]; then
  (cd "$SRC" && find . -type f ! -path "./INSTALL.md" ${MEM:+! -path "./$MEM"} \
     | grep -Ev "$shared_re" | tr '\n' '\0') \
    | (cd "$SRC" && tar --null -cf - --files-from=-) | (cd "$TARGET" && tar -xf -)
else
  (cd "$SRC" && find . -type f ! -path "./INSTALL.md" ${MEM:+! -path "./$MEM"} -print0) \
    | (cd "$SRC" && tar --null -cf - --files-from=-) | (cd "$TARGET" && tar -xf -)
fi
echo "  copied  skills, playbooks, agents, runtime"
[ "$SKIP_SHARED" = 1 ] && echo "  skipped docs/ and automations/ (a user-level install must not merge into ~/docs)"

# The guide and automation pack are host-specific in content but share a path.
# Installing a second host over the first silently rewrites them.
if [ "$SKIP_SHARED" != 1 ] && [ -f "$TARGET/docs/pstack-guide/README.md" ]; then
  # grep exits non-zero when it matches nothing, and with `set -e` plus `pipefail`
  # that silently aborted the whole install before the memory file was merged.
  prev=$(grep -rlo "\.claude/skills\|\.agents/skills\|\.github/skills" "$TARGET/docs/pstack-guide" 2>/dev/null | head -1 || true)
  if [ -n "$prev" ] && ! grep -q "$(printf '%s' "$SKILLDIR_HINT")" "$prev" 2>/dev/null; then
    echo "  note: docs/pstack-guide and automations now describe the $HOST layout."
    echo "        another host was installed here previously; its guide links were replaced."
  fi
fi
[ -n "$MEM" ] && merge_memory "$MEM"

mkdir -p "$TARGET/.pstack"
if [ -f "$TARGET/.pstack/mode.md" ]; then
  echo "  kept    .pstack/mode.md (your mode state is untouched)"
else
  cat > "$TARGET/.pstack/mode.md" <<MODE
active: false
entered: never
playbook: none
tier: unresolved
opt_out_phrase: "pstack off"
MODE
  echo "  created .pstack/mode.md (mode is OFF until you turn it on)"
fi
[ -f "$TARGET/.pstack/host.json" ] && echo "  kept    .pstack/host.json (re-run /setup-pstack to refresh it)"

echo
echo "next: open a new session in $TARGET and run:"
case "$HOST" in
  codex) echo "  \$setup-pstack" ;;
  *)     echo "  /setup-pstack" ;;
esac
echo "it probes what this host can really do and writes .pstack/host.json."
