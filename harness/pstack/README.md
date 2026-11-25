# pstack harness tree

This folder is generated from `pstack/skills`, `pstack/agents`, `pstack/docs/guide`, the adapters in `pstack/docs/harness/`, `pstack/README.md`, `pstack/LICENSE`, and `pstack/plugin.json`. Do not edit it by hand.

Cursor uses `pstack/` directly. Claude Code installs `claude-code/`, and Codex installs `codex/`. Each tree leaves out the rest of `pstack/`, such as `pstack/automations` and `pstack/assets`. A relative link to a pstack file that the tree leaves out points at that file on GitHub `main` instead.

Codex's `agents/openai.yaml` files are generated from each skill's `disable-model-invocation` flag. The files in `codex/agents/` are prompt references, not registered Codex agent types.

After editing those sources, run `node scripts/generate-pstack-harness-trees.mjs` from the repository root and commit the result.
