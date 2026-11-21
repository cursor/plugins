# T3 Code Cross-Provider Overlay

Apply this overlay on top of the host adapter ONLY when T3 Code tools (`orchestrator_capabilities`, `delegate_task`) are present. When absent (standalone Claude Code, `agy`, or Codex), skip this file completely and follow the host adapter as written.

## 1. Native Subagent vs `delegate_task`
- Keep the host native subagent (`Agent`, `invoke_subagent` / `run_workflow`, `spawn_agent`) for same-provider work needing no extra options and no separate worktree.
- Use `delegate_task` for cross-provider seats/reviews, explicit provider options (`fastMode`, `thought_level`, `reasoningEffort`, or another model family), and parallel `isolation: "worktree"` fan-outs.
- Never silently fall back inside T3 Code: if a configured provider or model is disabled/unavailable in `orchestrator_capabilities`, report it and ask the user instead of switching to external CLIs or same-vendor native tools.

## 2. Dynamic Capability & Pattern Mapping
Call `orchestrator_capabilities` once per thread before the first `delegate_task` (again only after an error or user-named provider change). Read `inheritedProviderInstanceId`, `inheritedModel`, enabled `providers[]`, and declared `options`:
- `claude-<family>-<ver>-<effort>[-fast]` (or `<family> <effort>`): enabled `claudeAgent`, `model: "claude-<family>-<ver>"`, `options: { effort: "<effort>" }` (+ `fastMode: true` only when `-fast` is present and declared). Always prefer `claudeAgent` over `antigravity`'s Claude mirror when `claudeAgent` is enabled.
- `gemini-<ver>-<variant>-<effort>`: first enabled `antigravity` offering `gemini-<ver>-<variant>`, `options: { thought_level: "<effort>" }` (always pass `thought_level` explicitly).
- `gpt-<id>[-<effort>]`: enabled `codex`, `model: "gpt-<id>"`, `options: { reasoningEffort: "<effort>" }` (when `<effort>` is present).
- `t3:<providerInstanceId>/<model>[:<effort>[:fast]]`: target `providerInstanceId` and `model` directly; map `<effort>` to the declared key (`effort` / `thought_level` / `reasoningEffort`) and pass `fastMode: true` only when `:fast` is present and declared.
- `inherit-parent`, `auto`, `inherit`: keep `inheritedProviderInstanceId` and `inheritedModel`.

## 3. Vendor Classification
Compute vendor from model family, not `providerInstanceId`: `claude-*` (including `claude-fable-*`) -> `anthropic`, `gemini-*` -> `google`, `gpt-*` / `codex` -> `openai`. Compare against `inheritedModel`'s vendor for `/arena` Phase C cross-judge and second opinions.

## 4. Parallel Panel Execution (`/arena`, `/interrogate`)
- Launch all N seats in one turn (`mode: "async"`, `isolation: "worktree"`, `role: "review"` for `/interrogate`, `"implementation"`/`"design"` for `/arena`). Follow `next` and end your turn (no `task_status` polling, no `sleep`, `task_cancel` to stop).
- Never create child worktrees manually in the shell (`git worktree add`). Because `isolation: "worktree"` checks out `HEAD` without uncommitted edits: if `git status --porcelain` is dirty and uncommitted edits are in scope, write `git diff --binary HEAD > /tmp/pstack-panel-<slug>/uncommitted.patch` and copy in-scope untracked files under `/tmp/pstack-panel-<slug>/untracked/`, then instruct each child at the top of `task` to apply them in its own worktree and keep repro artifacts there. Respect user Expo/mobile rules (never `--clean` or wipe `ios/`/`android/` caches).
- Children see no parent history: under `/poteto-mode`, line 1 of `task` is `Read <abs-path>/skills/poteto-mode/worker.md before anything else.` followed by a one-line inline fallback (work solo without subagents, hold to kickoff bar, never ask a human, report only verified runs).
- Phase C cross-judge: `delegate_task(isolation: "shared", role: "review", ...)`, anonymous labels (`candidate-1`, `candidate-2`, ...), explicit `"Read-only review: do not edit any files"`, and verify parent `git status` afterward.
- Always spawn a fresh `delegate_task` for re-reviews or fix checks (never `t3_thread_send`).

## 5. Shared Config & `/setup-pstack` (All T3 Code Agents)
- **Single shared rule file:** In T3 Code, all three agents (Claude Code, Antigravity, Codex) read and write `$XDG_CONFIG_HOME/pstack/t3-models.md` (default `~/.config/pstack/t3-models.md`) as the single source of truth for pstack role and panel-seat overrides.
- **Precedence:** Whenever running any pstack skill in T3 Code, read `~/.config/pstack/t3-models.md` first. Its role lines override any host-specific rule file (`~/.claude/rules/pstack-models.md`, `<pstack>/rules/AGENTS.md`, `~/.codex/pstack/models.md`), including rules auto-loaded into context. If `~/.config/pstack/t3-models.md` is absent or omits a role, fall back to the host rule file, then to the skill's upstream default.
- **Unified `/setup-pstack` workflow** (overrides each host adapter's standalone rule path when T3 Code tools are present):
  1. **Detect:** Call `orchestrator_capabilities` once; offer every enabled provider's models and declared effort values at `xhigh` or below, plus `inherit-parent` and `auto`.
  2. **Load:** Read `~/.config/pstack/t3-models.md` if present; otherwise start from upstream `setup-pstack` Step 5 defaults (applying upstream Step 2 retirement/migration rules as written).
  3. **Budget & per-role/seat customization:** Follow upstream `setup-pstack` Step 3 (`large` / `medium` / `small` on `xhigh > high > medium > low`, applying the effort step to both canonical slugs and `t3:<providerInstanceId>/<model>:<effort>[:fast]` specs), letting the user accept as-is or customize any individual role or panel seat.
  4. **Validate:** Every real slug or `t3:` spec must match an enabled provider, model, and effort (`xhigh` or below) from `orchestrator_capabilities`; `inherit-parent` and `auto` always pass.
  5. **Write & confirm:** Create `~/.config/pstack/` if needed and overwrite `~/.config/pstack/t3-models.md` as plain Markdown (no frontmatter) in the exact upstream Step 5 shape (`# defaults: 3`, `# budget: ...`, one line per role). Do NOT overwrite standalone host rule files during a T3 Code `/setup-pstack` run. Confirm the change applies consistently to Claude Code, Antigravity, and Codex inside T3 Code.
- **Standalone isolation:** Outside T3 Code (when `orchestrator_capabilities` and `delegate_task` are absent), ignore `~/.config/pstack/t3-models.md` and follow each host's standalone adapter and rule path unchanged.

## 6. Native T3 Code Tools
When exposed in the session, prefer T3 Code's native MCP tools across all three agents:
- **PR & CI (`Opening a PR`, `Babysit`, `Shipping`):** prefer `pull_request_*`, `watch_pull_request`, `ci_logs`, `ci_rerun`, and `link_pull_request` over shell `gh` or `watch-pr` polling scripts.
- **Worktrees:** use `delegate_task(isolation: "worktree")` or `t3_worktree_handoff` instead of creating child worktrees manually in the shell.
- **UI & mobile verification (`Prove It Works`):** use `preview_*` for web and `device_*` for iOS Simulator / Android Emulator (respecting user mobile/Expo build-cache rules).
- **Schedules & secrets:** use `schedule_task` (in place of Cursor Automations / `/loop`) and `request_secret` (in place of `SendToUser`).
