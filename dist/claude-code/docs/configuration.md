---
title: Configure pstack models and behavior
description: Exact identities, profile precedence, explicit fallback, and idempotent setup.
---

## Precedence and state

All clients read the same config through the invoked skill, not through a
speculative native setting. The helper merges:

1. Packaged `config/defaults.json`
2. `~/.config/pstack/config.json`, respecting `XDG_CONFIG_HOME` or `PSTACK_CONFIG`
3. The active project's `.pstack/config.json`
4. An explicit `--override` JSON/file for that invocation

Host policy and entitlements take precedence over these preferences.
`--repo` identifies the active project, not the installed plugin directory.
Setup stores only chosen overrides, validates the merged result, preserves
unrelated fields, and avoids rewriting identical content. Invalid JSON is an
actionable error, never a reset to defaults. State/logs should live under the
active project's `.pstack/state/` or an explicit user data directory, not the plugin.

## Configure a profile

Save a partial JSON input outside the plugin, then run setup. Example:

```json
{
  "schemaVersion": 1,
  "profile": "general-purpose",
  "limits": { "maxConcurrent": 2, "maxWorkers": 2 },
  "roles": {
    "implementation": { "family": "gpt", "fallback": "inherit" },
    "architecture": { "family": "claude", "tier": "opus", "fallback": "inherit" },
    "exploration": { "family": "claude", "tier": "sonnet", "speed": "standard", "fallback": "inherit" },
    "review": [
      { "family": "gpt", "fallback": "stop" },
      { "family": "claude", "fallback": "stop" }
    ]
  }
}
```

```bash
node /absolute/plugin/scripts/pstack-config.mjs setup --scope user --input choices.json --repo /absolute/project
node /absolute/plugin/scripts/pstack-config.mjs setup --scope repo --input project-choices.json --repo /absolute/project
```

General-purpose is professional, bounded, and conservative about comment removal.
`personal` is opt-in stylistic behavior, not relaxed safety or permission limits.
Larger limits and optional integrations must be explicitly authorized. Integration
keys are `cursorTeamKit`, `bugbot`, `automations`, `transcriptMining`, and `uiControl`.

Roles are implementation, exploration, architecture, explanation, verification,
and the two-member review/candidate panel. The shared profile carries no version
IDs. Family preferences select among the supplied eligible inventory in order.
For reproducibility set `id` to an exact ID copied from that runtime. A merged
family/tier must agree with the supplied identity. Set an optional selector
field (`id`, `family`, `tier`, `reasoningEffort`, or `speed`) to `null` to
explicitly clear its inherited constraint/control. A role still needs a
non-null `id` or `family`, and exact fallback entries always need an ID.
For example, switching architecture to GPT uses
`{"family":"gpt","tier":null,"id":null}`. Omitting a field instead inherits it.

## Discovery and routing

Copilot CLI's `/model` shows available models and vendor/provider groupings.
VS Code offers model picker and agent-file completions for the chosen harness.
Cursor and Claude use their supported model/schema facilities. Do not equate
display names with runtime IDs, guess a family from its string, or use public
model tables as entitlement evidence.

Supply a catalog copied from those host facilities:

```json
{
  "models": [
    { "id": "<exact GPT ID from this host>", "family": "gpt", "provider": "host-reported provider" },
    { "id": "<exact Claude ID from this host>", "family": "claude", "tier": "opus" }
  ],
  "selected": { "id": "<selected exact host ID>", "family": "gpt" }
}
```

Placeholders must be replaced; they are not model IDs. Unknown metadata is
omitted, not inferred. Include `reasoningEfforts` and `speeds` arrays only when
the host advertises those values for the exact model. Catalog order is an explicit
preference order when several entries match.

```bash
node scripts/pstack-config.mjs resolve --runtime copilot-cli --role review --catalog catalog.json
node scripts/pstack-config.mjs resolve --runtime vscode-local --role implementation
```

The second command has no inventory and visibly inherits with unknown identity.
Without a discovery facility, require explicit confirmed configuration for named
models or inherit. Configuration alone is not evidence of availability.
The helper never calls a model, logs in, or adds a provider API client.

## Identity and controls

Selectors keep `id`, `family`, `tier`, `reasoningEffort`, and `speed` separate.
Provider is catalog metadata. IDs are exact and never modified with suffixes.
Effort and speed controls are emitted only when advertised by the chosen model
and must be mapped to supported live runtime fields by the adapter. Unsupported
controls stop or use the configured fallback with warnings. Inherited roles
omit selectors and controls; the host's selected effort/speed remain in effect.

Fallback is `stop`, `inherit`, or an ordered list of exact selectors:

```json
{
  "roles": {
    "implementation": {
      "id": "<preferred exact GPT ID>",
      "family": "gpt",
      "fallback": [{ "id": "<available exact fallback ID>", "family": "gpt" }]
    }
  }
}
```

Unavailable requested seats never silently become extra copies of another seat.
Strict panels require two distinct identities and known distinct families.
An explicitly chosen `--panel-mode independent-unverified` cannot claim
cross-family diversity when metadata is unavailable. Inheritance is not an
acceptable fallback for a missing strict panel seat.

## Generate native model-specific agents

If a runtime's delegation tool does not accept per-call model selection, generate
native user/repository agents from the resolved role:

```bash
node scripts/pstack-config.mjs agents --runtime copilot-cli --role review --catalog catalog.json --scope user
node scripts/pstack-config.mjs agents --runtime vscode-local --role review --catalog local-catalog.json --scope repo --repo /absolute/project
```

These create `pstack-review-1` and `pstack-review-2` in supported native agent
directories, outside the plugin. They require resolved models, refuse unrelated
file collisions, and are idempotent. Restart and inspect model/tool discovery.
All panel seats and existing files are checked before any writes. A two-member
review is rejected when `maxWorkers` is less than two; `maxConcurrent: 1`
allows sequential independent review.
Use exactly those agents for the panel. They point to this package's policy
with an explicit absolute path; regenerate after relocating/uninstalling it.

Native Copilot CLI supports required model policy. VS Code plugin conversion
does not forward every field, so verify native loading and actual selection.
Local agent files cannot carry portable speed/effort controls; generation rejects
them instead of silently dropping them. Use a supported live tool selector instead.

The helper is preflight validation, not a scheduler, sandbox, or runtime model lock.
Strict required-model work stops when runtime enforcement or actual identity
cannot be verified. Independent same-family/unknown-family review is not advertised
as GPT/Claude review.

## Migrate legacy configuration

Legacy `~/.cursor/rules/pstack-models.mdc` and
`~/.claude/rules/pstack-models.md` are preserved, not automatically parsed or
overwritten. Setup reads them only as an explicitly approved migration input.
Map old role labels with [the core role table](./core.md), confirm each exact
host ID/alias and controls, then save JSON. Review/remove conflicting old role
instructions yourself after successful setup. No unrelated configuration is lost.
