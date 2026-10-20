# Rule audit

## Sub-features
- `rule-audit`: `~/.cursor/rules/onprem-models.mdc` (when present) has `alwaysApply: true`, a `# budget: unlimited (max)` line, a HARD LOCK comment line naming all four real slugs plus both aliases, and exactly 18 role lines whose values are all in the closed set.

## How to get to it (user POV)
The rule file is the configuration half of the lock. An operator who hand-edited it, or who re-ran `/setup-onprem` on a machine with different entitlements, wants a mechanical answer to "did the rule land right?" before the first real task.

## Driving it with verify.py
Part of the default pass. On a machine without the rule (fresh clone), the suite reports `skip:` and still exits 0; that is the correct, labeled state, not a pass.

## Gotchas
- This suite cannot see the session's detected model list, so it validates the closed set, not availability. The session-detected check belongs to the `/onprem-mode` audit playbook, which runs where a session exists.
- The budget line is asserted to be `unlimited (max)` because principle-unlimited-budget makes the budget a confirmation, not a choice. If the doctrine changes, change the principle and this check together.
