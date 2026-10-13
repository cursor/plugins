# Setup

Two steps. The install changes nothing until you run the setup skill.

## 1. Install

```bash
/add-plugin onprem
```

or place the plugin directory at `~/.cursor/plugins/local/onprem/`. Cursor picks up skills and agents from there.

## 2. Run `/setup-onprem`

It does seven things, in order:

1. **Detects** the model slugs available to your session, and strips the banned families from what it shows you.
2. **Loads** your current `~/.cursor/rules/onprem-models.mdc` if one exists, so a re-run keeps your choices.
3. **Confirms the budget.** The onprem stack runs `unlimited (max)` and depth is never rationed, so the budget is a confirmation, not a choice. It is recorded as the rule's `# budget` line; it does not rewrite the model slugs, which carry no effort token.
4. **Shows the role map** and lets you change individual roles. You are offered only allowlisted detected models, plus `inherit-parent` and `auto`.
5. **Validates.** Every real slug must be allowlisted *and* available. A banned or unavailable slug stops the write. This is a gate, not a warning.
6. **Writes** the rule file, overwriting it whole so re-runs stay idempotent.
7. **Confirms**, names the allowlist, names what the `inherit-parent`/`auto` roles inherit (and warns when the parent chat is a frontier model), and offers a `/create-verify-skill` pass if your project has no way to prove app behavior.

The rule file applies to **new sessions**. A model change mid-chat does not re-route subagents already in flight.

## What the rule file is

`~/.cursor/rules/onprem-models.mdc` is an always-applied rule: one line per role, `role: model`. It is the single source of truth for which model each delegation runs on. The skills' inline defaults are themselves locked to the same allowlist, so the fallback path cannot leak a frontier model.

## Coexistence with pstack

If you also run pstack, each stack reads its own rule file (`pstack-models.mdc` vs `onprem-models.mdc`). To keep one source of truth for the allowlist, point pstack's role values at the same on-prem models. `/setup-onprem` offers this alignment; it does not replace the pstack rule.

Next: [The lock](./02-the-lock.md).
