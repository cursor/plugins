# Optional global companion files

Codex plugins do not install personal custom-agent profiles or edit global
instructions as a manifest side effect. Run `$pstack:setup-pstack` after installing
the plugin. It compares these templates with the active Codex home, shows the
exact change, and waits for authorization before writing.

- `agents/pstack_spark.toml`: bounded micro-edits.
- `agents/pstack_luna.toml`: high-volume evidence and repetitive work.
- `agents/pstack_terra.toml`: everyday engineering.
- `agents/pstack_sol.toml`: architecture and difficult work.
- `agents/pstack_poteto.toml`: Poteto playbook executor.
- `agents/pstack_comment_sicko.toml`: read-only comment reviewer.
- `AGENTS.fragment.md`: the package-owned global routing block.

Every profile pins `model_reasoning_effort = "xhigh"`. The setup skill updates
only these six exact `pstack_*.toml` files and the marked block; it preserves all
unrelated global configuration.
