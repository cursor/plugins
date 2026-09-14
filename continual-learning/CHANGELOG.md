# Changelog

## 1.1.0

- Default memory file is `~/.cursor/projects/<slug>/AGENTS.local.md`.
- Stop-hook followup embeds resolved absolute paths and forbids writing the
  repo-tracked `AGENTS.md` unless an allowed shared workspace file is set.
- `preToolUse` denies Write/StrReplace of `## Learned *` sections into
  repo-tracked `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`, except the configured
  workspace file when it is gitignored or `CONTINUAL_LEARNING_ALLOW_SHARED=1`.
- Cadence/index default to `~/.cursor/projects/<slug>/continual-learning/`.
  Legacy files are copied; tracked originals are not deleted.
- Keep `## Learned Workspace Facts` (no `(local)` heading rename).
