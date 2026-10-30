# Codex packaging

The `.codex-plugin/plugin.json` entry point exposes the existing `skills/`
tree as `pstack-plugin`. Cursor continues to use `.cursor-plugin/plugin.json`
and the `pstack` namespace.

Skills marked `disable-model-invocation: true` also carry Codex's
`policy.allow_implicit_invocation: false` in `agents/openai.yaml`. They remain
available for explicit selection without entering Codex's automatic skill
catalog. `setup-pstack` retains automatic invocation.

A personal Codex marketplace can point to the package without copying or
rewriting its skills:

```json
{
  "name": "pstack-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/cursor/plugins.git",
    "path": "pstack",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Developer Tools"
}
```

This adds discovery and invocation metadata. The original workflows still
refer to Cursor facilities and model availability; the manifest does not
register Cursor agents, hooks or automation examples in Codex.

When adding skills or changing their invocation policy, run from the
repository root:

```sh
python3 pstack/scripts/check-codex-package.py
```

The check fails when a skill's Codex policy differs from its source flag.
It does not exercise the workflows or establish cross-host runtime parity.
