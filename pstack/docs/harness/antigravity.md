# pstack in Antigravity (`agy`)

pstack skills use Cursor names. In Antigravity (`agy`), read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder holding `skills/` and `docs/` (two levels up from any skill's `SKILL.md`, e.g. `~/.gemini/config/plugins/pstack` or the `skills.json` target's parent). If a Cursor field has no row, drop it and say so. Never pass a field, model slug, or schema value that an Antigravity tool rejects.

## Orchestrator Two-Phase (`Plan` -> `Execute`) Compatibility

Antigravity Orchestrator models run in two phases per request: a read-only **Plan** turn (`exit_plan_mode` is available and file-editing tools are disabled) followed by an **Execute** turn.

- **When `exit_plan_mode` is present (Plan Mode active):** Do not attempt edits or spawn write subagents. Complete the read-only upfront phases inside Plan Mode:
  1. Match the task to a `poteto-mode` playbook and select applicable principles from the inline index.
  2. Run read-only exploration (`read_file`, read-only `run_command`, or `invoke_subagent` with `TypeName: "research"`).
  3. Sketch at least two boundary/data-shape options (`/architect`) and pick the shape with one owner per piece of state (or plan an `/arena` bakeoff for a large or contested design).
  4. Hand off via `exit_plan_mode` with the matched playbook's steps, named data shape, verification commands, and `Re-plan if` signs so the Execution turn runs prototypes, `poteto-agent` delegates, and verification.
- **When `exit_plan_mode` is absent (`--mode auto`, `--mode accept-edits`, or single-phase models):** Execute the matched playbook directly end-to-end.

## Tools

| Cursor | Antigravity (`agy`) |
| --- | --- |
| `Task` | `invoke_subagent` for 1-3 targeted delegates; `run_workflow` with `parallel(items, fn)` for multi-item fan-outs (`/pstack-swarm`, `/arena`, `/interrogate` in default same-vendor mode). |
| `AskQuestion` | `ask_question` (put the recommended option first prefixed with `(Recommended)`). In `-p` / `--print` mode where `ask_question` is absent, ask in plain text. |
| Open a todolist, or copy steps into the todolist tool | Maintain a Markdown checklist in your reply (or `<appDataDir>/brain/<conversation-id>/task.md` for long tasks) and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Note: pstack's `swarm` skill is renamed to **`pstack-swarm`** (`/pstack-swarm`) in Antigravity so it never overrides Antigravity's built-in `swarm` message-board skill. Read `<pstack>/skills/<name>/SKILL.md` with `read_file` and follow it. |
| `/loop` | Use Antigravity's `schedule` tool (`DurationSeconds` or `CronExpression`) and end your turn for reactive wakeup; for recurring background cron jobs across sessions, suggest `/schedule` or the built-in `automation` skill. |
| `control-ui`, `control-cli` | Use the installed `chrome-devtools` skill for web/Electron UI, `android-cli` / `android-device-hub` for Android, and `run_command` for CLIs/TUIs. |
| `Grep`, `Glob` | `run_command` with `rg` / `find` (or `grep_search` / `find_by_name` when exposed). |

## Subagent fields

| Cursor | Antigravity (`agy`) |
| --- | --- |
| `subagent_type: generalPurpose` | `TypeName: "self"` (for `invoke_subagent`) or `type_name="self"` (for `run_workflow` `agent()`). |
| `poteto-agent`, `comment-sicko` | Use `TypeName: "poteto-agent"` / `"comment-sicko"` when registered. If unregistered (e.g. loaded via `skills.json` in an isolated T3 Code profile), register it with `define_subagent` (or use `TypeName: "self"`) using the agent brief from `<pstack>/agents/`. Always include the absolute path `<pstack>/skills/poteto-mode/SKILL.md` in every `poteto-agent` `Prompt`, and start the prompt with `Read <pstack>/skills/poteto-mode/worker.md before anything else.` |
| `readonly: true` | `TypeName: "research"` (true read-only sandbox with no network access). When a check (`/interrogate`) must run repro commands, use `TypeName: "self"` with `Workspace: "share"` (or `run-external-agent.mjs --mode readonly-bash`) and verify main workspace `git status` stays clean afterward. |
| `readonly: false` | `TypeName: "self"` or `TypeName: "poteto-agent"`. |
| `environment: "cloud"` | `Workspace: "share"` (git-worktree-like shared repo copy) or `Workspace: "branch"` (isolated clone). Respect user rules in `GEMINI.md` / `AGENTS.md`: on Expo/mobile repositories, preserve `ios/`, `android/`, and build caches and never run `--clean` or delete native build caches. |
| `environment: "local"` | `Workspace: "inherit"`. |
| `cloud_base_branch: <b>` | Use `Workspace: "share"` and instruct the worker to check out `<b>` first. |
| `run_in_background: true` | Default in `invoke_subagent` and `run_workflow`. Stop calling tools (or do independent work) and wait via Antigravity Reactive Wakeup; never poll or `sleep`. |
| `resume` | Call `send_message(Recipient=conversationId, Message=...)`, or reuse a stateful `a = agent(...)` handle inside `run_workflow`. |
| `file_attachments` | List absolute file paths in `Prompt`. |

## Models & Cross-Vendor Execution (`claude` & `codex`)

### In T3 Code (Preferred When Available)

When `orchestrator_capabilities` and `delegate_task` are present, read [the T3 Code overlay](./t3-code.md) once per session and use `delegate_task` for cross-provider panel seats, `isolation: "worktree"` fan-outs, and canonical or `t3:` model specs. Standalone Antigravity uses the rules below.

### 1. Default Mode: Same-Vendor Fast Concurrency

By default, pstack in Antigravity runs **fast same-vendor concurrency** using native `invoke_subagent` and `run_workflow`, consuming zero external CLI quota unless cross-vendor execution is configured or requested:

| Cursor | Antigravity (`agy`) |
| --- | --- |
| `claude-` slugs (`claude-opus-5-5-xhigh-fast`, `claude-fable-5-2-high`, etc.), `grok-`, `gpt-`, `gemini-*` | Map to `Model: "inherit"` by default (or `"pro"` / `"flash"` / `"flash_lite"` when configured in `<pstack>/rules/AGENTS.md`). Never pass raw model slugs to `invoke_subagent` or `run_workflow` — their schema only accepts `"inherit"`, `"pro"`, `"flash"`, and `"flash_lite"`. |
| `auto` or `inherit-parent` | `Model: "inherit"`. |
| `pstack-models.mdc` (`~/.cursor/rules/pstack-models.mdc`) | In T3 Code, read shared `~/.config/pstack/t3-models.md` first (per `./t3-code.md`), otherwise `<pstack>/rules/AGENTS.md`. Antigravity loads plugin `rules/AGENTS.md` automatically while `pstack` is enabled. If a role is missing, keep the skill's upstream default (routed via `./t3-code.md` in T3 Code, or mapped to `Model: "inherit"` in standalone Antigravity). |
| `/arena` Phase C cross-judge under `inherit` | When `arena cross-judge pool` resolves only to `inherit` (same vendor as the parent), skip Phase C cross-judge per `arena` vendor rules and note why, unless the user requests a cross-vendor judge or configures one below. |

### 2. Optional Cross-Vendor Mode (`claude`, `codex`, and built-in `swarm`)

Cross-vendor diversity is supported on demand (when the user asks for `claude`, `codex`, or multi-model checks) or when configured in `<pstack>/rules/AGENTS.md` using these spec formats:

- **`cli:codex`** or **`cli:codex:<model>`** (vendor: `openai`)
- **`cli:claude`**, **`cli:claude:<model>`**, or **`cli:claude:<model>:<effort>`** (vendor: `anthropic`, e.g. `cli:claude:opus:xhigh`, `cli:claude:fable:high`, `cli:claude:sonnet:high`)
- **`swarm:<agy-model-slug>`** (uses Antigravity's built-in `swarm` tool, e.g. `swarm:gemini-4-neon-xhigh`, `swarm:claude-opus-5-5-high`, `swarm:gpt-oss-120b-medium`)

#### How to invoke `cli:codex` and `cli:claude` safely

Use the bundled runner `<pstack>/docs/harness/run-external-agent.mjs` via `run_command` (or fan out multiple arms concurrently via `run_workflow` calling `parallel(arms, lambda arm: call_tool("run_command", ...))`):

1. Write the full self-contained brief/prompt to `<appDataDir>/brain/<conversation-id>/scratch/<arm>-prompt.md` (never pass multi-line prompts inline in shell arguments).
2. Choose `--mode` strictly by role:
   - Read-only cross-judge or design review: `--mode readonly` (pass `--snapshot` to isolate in a temporary detached git worktree even for pure file reads).
   - Adversarial check (`/interrogate`) needing test/repro execution: `--mode readonly-bash`. When `--cwd` is inside a git repository, `run-external-agent.mjs` automatically creates a temporary detached git worktree snapshot (preserving tracked edits + untracked non-ignored files + `node_modules` symlinks), runs the agent there, verifies neither the snapshot nor source repo was mutated (exiting `76` with JSON `readonly_violation` if violated), and cleans up on exit or timeout (pass `--no-snapshot` only to disable).
   - Parallel implementation candidate (`/arena` worker): create a dedicated git worktree (`git worktree add /tmp/arena-<slug>/<arm> HEAD`) or scratch dir first, pass `--mode worktree --cwd /tmp/arena-<slug>/<arm> --main-workspace <workspace-root>`. `run-external-agent.mjs` refuses `--mode worktree` with exit code `2` if `--cwd` resolves to the main workspace.
   - Quota / rate-limit failover: exit `75` (`EX_TEMPFAIL`) with a JSON `external_agent_quota` payload on `stderr` signals HTTP 429 / usage-limit exhaustion so callers can cleanly fail over without misclassifying as `1` (error) or `124` (timeout).
   - Streaming heartbeat & checkpointing: `claude` runs with `stream-json` and `codex` with `--json` so active tool/thinking output continually refreshes the inactivity watchdog (`--idle-timeout-ms`, default `900000`). Wall-clock timeout defaults to `--timeout-ms 0` (no arbitrary kill while stream events keep arriving); even when a positive `--timeout-ms` is supplied, active streams are softly extended (up to 2h) unless `--hard-timeout` is explicitly passed. Never pass artificially short wall caps (like `--timeout-ms 600000`) or point `--cwd` at a multi-repo parent directory — scope `--cwd` to the target repository. If interrupted or timed out (`124`), accumulated partial text is saved to `<out>.partial`.
3. Run:
   ```bash
   node <pstack>/docs/harness/run-external-agent.mjs \
     --spec <cli:codex[:model]|cli:claude[:model[:effort]]> \
     --mode <readonly|readonly-bash|worktree> \
     --cwd <target-dir> \
     [--snapshot|--no-snapshot] \
     [--main-workspace <workspace-root>] \
     [--timeout-ms 0] [--idle-timeout-ms 900000] [--hard-timeout] \
     --prompt-file <scratch-prompt-file> \
     --out <scratch-out-file>
   ```

## `setup-pstack` in Antigravity

When `/setup-pstack` runs in Antigravity:

- In T3 Code, follow [the T3 Code overlay](./t3-code.md) instead (reads and writes shared `~/.config/pstack/t3-models.md` across Claude Code, Antigravity, and Codex).
- In standalone Antigravity, follow the steps below:

1. **Detect**:
   - Native tiers for `invoke_subagent` / `run_workflow`: `inherit`, `pro`, `flash`, `flash_lite`.
   - T3 Code providers & models (when available): call `orchestrator_capabilities`.
   - External CLIs: run `node <pstack>/docs/harness/run-external-agent.mjs --probe`.
   - Built-in `swarm` models (optional): call `swarm(action="models", all=true)`.
2. **Default policy**: Keep routine single-agent roles at `inherit` (fast same-vendor concurrency) and omit panel role lines so panels follow upstream skill defaults automatically. Add or edit any individual role or seat line when the user wants overrides (`inherit`, canonical slugs, `t3:...`, `cli:...`, `swarm:...`).
3. **Write**: Overwrite `<pstack>/rules/AGENTS.md` as plain Markdown (no frontmatter, under 24,000 bytes), keeping `# user-configured: true`, `# defaults: 3`, `# budget: ...`, and the role lines so re-installing pstack preserves user preferences. Never put pstack role lines in project `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`.

## Paths

| Cursor | Antigravity (`agy`) |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.agents/skills/`, `~/.gemini/config/skills/` |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.gemini/config/plugins/`, `plugin.json` |
| `.cursor/rules/` (always-applied rules) | `<pstack>/rules/AGENTS.md` for pstack model config; `AGENTS.md`, `GEMINI.md`, or `.agents/rules/*.md` for repository/global rules |
| `agent-transcripts` (`~/.cursor/projects/<slug>/agent-transcripts/`) | `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl` (and `transcript_full.jsonl` when `truncated_fields` is present) |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists locally; otherwise use the GitHub URL. |

## Cursor-only features

Antigravity has no Cursor Automations, Bugbot, Cursor cloud agents dashboard, or built-in PR tool. When a step requires one, include one line in your reply: `Skipped in Antigravity: <step>. <reason>.`, then continue to the next step without blocking or retrying.

| Cursor | Antigravity (`agy`) |
| --- | --- |
| Cursor Automations: routines, `update_state`, `api2.cursor.sh/automations` webhooks, `SendToUser` | Skip with the one-line note; suggest Antigravity's `/schedule` or `automation` skill (`sidecar.json`) when the user wants local cron schedules. |
| Bugbot | Treat GitHub PR review threads as regular PR comments using `gh` commands; skip steps that start or configure Bugbot. |
| Cursor cloud agents | `environment: "cloud"` maps to `Workspace: "share"` / `"branch"`; skip cloud-dashboard-only steps. |
| A built-in PR tool | Use `gh` CLI commands (`gh pr create`, `gh pr view`, `gh pr merge`). That is not a skip, so write no skip line. |
