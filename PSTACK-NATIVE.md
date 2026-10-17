# Maintaining native pstack packages

`pstack/` remains the shared upstream source. The generated packages are separate:

| Host | Adapter | Generated package |
| --- | --- | --- |
| Claude Code | `pstack/docs/harness/claude-code.md` | `harness/pstack/claude-code/` |
| Codex | `pstack/docs/harness/codex.md` | `harness/pstack/codex/` |

Like the Claude Code package, the Codex package translates the shared prose at runtime through its adapter instead of forking it. Every Codex skill links to the adapter before the shared instructions, takes its directory name as its skill name, and maps upstream `disable-model-invocation` to `allow_implicit_invocation` in `agents/openai.yaml`. The agent Markdown files are portable prompts, not registered Codex agents. Like the Claude Code tree, the package ships skills, agents, and the adapter; links to the guide and README point at GitHub. Both packages leave out `make-bot-ui` and the lines that link to it, because it needs Grok Bot host tools; it stays in `pstack/` for Cursor.

## Regenerate and verify

After incorporating upstream changes or editing either adapter:

```sh
node scripts/generate-pstack-harness-trees.mjs
node scripts/generate-pstack-codex.mjs
node scripts/generate-pstack-harness-trees.mjs --check
node scripts/generate-pstack-codex.mjs --check
node --test scripts/pstack-harness.test.mjs
```

Commit source and generated changes together. CI checks both packages. Inspect new host-specific workflows when updating upstream: a byte-for-byte regeneration check cannot prove behavioral compatibility. Package versions follow upstream; the fork's Git revision identifies adapter changes within a version.

## Install Codex from this checkout

```sh
codex plugin marketplace add <path-to-this-checkout>
codex plugin add pstack@kevintram-plugins
```

After these changes are published, the marketplace can instead be added as `kevintram/plugins`. Start a new task and invoke `$poteto-mode`. Keep the native package separate from personal skills; do not also install its individual skill directories into shared agent directories.

No Codex profiles, hooks, model rules, or automations are installed. `$setup-pstack` reports available capabilities; models inherit the parent. Cursor integrations and bundled Cursor-oriented programs are not automatically usable in Codex. See the adapter for exact fallbacks and limitations.
