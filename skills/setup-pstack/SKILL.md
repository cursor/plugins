---
name: setup-pstack
description: "Use for /setup-pstack, configure pstack models, reasoning budget, or changing role preferences. Validates available host models and preserves user and repository configuration."
---

# Setup pstack

Read [the core](../../docs/core.md) and the current [client adapter](../../docs/harness/README.md).
Do not execute another client's setup commands.

## Discover and load

Inspect entitled models in the current host's model picker, supported schema,
or model-list facility. Record exact IDs and known family/provider metadata.
Without discovery, ask for explicit available choices or leave inheritance
enabled with a warning. Never make paid probing calls.

Run `node <plugin-root>/scripts/pstack-config.mjs show --repo <project-root>`.
Precedence is bundled defaults, user JSON, repository JSON, then explicit
invocation overrides. Existing Cursor/Claude model rules are migration inputs;
do not overwrite them or unrelated native settings.

## Choose and confirm

Ask only for preferences that cannot be discovered: user or repository scope,
role choices, supported reasoning effort, speed, fallback, optional personal
profile, and limits. Show the complete resolved table before saving.
Architecture prefers Claude Opus, implementation prefers GPT, exploration can
use fast GPT or Claude Sonnet, and review prefers GPT plus Claude. All choices
are adjustable; never manufacture a version or suffix.

Use only advertised effort/speed controls. For inheritance, controls remain
host-selected. A strict two-family review requires known distinct families
and available models; absent metadata is a blocker, not diversity.

## Validate and save

Write only the confirmed partial pstack JSON to a temporary input outside the
package. Run:

```bash
node <plugin-root>/scripts/pstack-config.mjs setup --scope user --input <input.json> --repo <project-root>
```

Use `--scope repo` only for a confirmed project override. Setup validates the
effective configuration, atomically merges the target, and does not rewrite it
on an identical second run. It preserves unrelated JSON fields and does not
materialize defaults into repository overrides.

For model routing run `resolve --runtime <runtime> --role <role> --catalog
<catalog.json>`. On hosts without a per-call selector, use the `agents` command
to create explicitly configured native user/workspace agents outside the package.
Inspect their effective tools and model before relying on them.

Report the path, changes, inheritance/fallback warnings, and restart/discovery
requirements. Never claim the host loaded new configuration without checking.

## Optional verification tooling

If the project lacks a way to drive its real surface, offer the bundled
[create-verification-skill](../create-verification-skill/SKILL.md). For a property
that needs stronger proof, offer [formal verification](../create-formal-verification-skill/SKILL.md).
Declining either offer does not waive required verification.
