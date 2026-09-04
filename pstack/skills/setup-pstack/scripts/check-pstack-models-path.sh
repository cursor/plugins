#!/bin/sh
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

forbidden='~/.cursor/rules/pstack-models.mdc'
required='.cursor/rules/pstack-models.mdc'

if git grep -n -F -- "$forbidden" -- pstack ':!pstack/skills/setup-pstack/scripts/check-pstack-models-path.sh'
then
  printf '%s\n' "pstack-models must live at $required, not the home path" >&2
  exit 1
fi

if ! git grep -q -F -- "$required" -- pstack/skills/setup-pstack/SKILL.md
then
  printf '%s\n' "setup-pstack must write $required" >&2
  exit 1
fi

for reader in \
  pstack/skills/arena/SKILL.md \
  pstack/skills/swarm/SKILL.md \
  pstack/skills/interrogate/SKILL.md \
  pstack/docs/guide/01-setup.md \
  pstack/README.md
do
  if ! git grep -q -F -- "$required" -- "$reader"
  then
    printf '%s\n' "$reader must name $required" >&2
    exit 1
  fi
done
