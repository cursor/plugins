# Claude Code and Codex adaptation

Read this before following any pstack skill on Claude Code or Codex. These runtime substitutions override Cursor-specific mechanics, not the upstream engineering principles or playbook outcomes. On Cursor, follow the upstream instructions unchanged.

## Shared rules

Treat the directory containing the installed skill folders as the skills root. Resolve cross-skill paths from that root and each skill's `references/`, `scripts/`, and `playbooks/` from its own directory. In particular, poteto-mode's `scripts/...` means `<skills-root>/poteto-mode/scripts/...`, not the consumer repository's current directory.

- Use the tools actually exposed in this session. Do not invent a tool, model, background flag, or cloud environment.
- Resolve another pstack skill by its directory name in the installed skills root. Claude Code may invoke `pstack:<name>`; Codex may load the installed skill or read its `SKILL.md`.
- Generated workflow skills intentionally omit upstream `disable-model-invocation` so the model can discover and route to required skills. Poteto help and ketchup stay explicit-only through that field on Claude and `policy.allow_implicit_invocation: false` on Codex. Claude supports the field; its omission elsewhere is a portable routing choice, not an unsupported-field fix or permission to act.
- Read the model sheet at `${CLAUDE_CONFIG_DIR:-~/.claude}/pstack-models.md` on Claude Code or `${CODEX_HOME:-~/.codex}/pstack-models.md` on Codex. This replaces every reference to `~/.cursor/rules/pstack-models.mdc`. Read it explicitly; it is not an always-applied Cursor rule.
- An absent role defaults to `inherit-parent`, replacing upstream's Cursor model slugs. Use only models and reasoning levels confirmed available in the current harness. Do not send Claude or Grok model IDs to Codex. A Cursor effort suffix is not part of a portable model ID.
- For multi-model panels, use distinct configured models when the tools support them. Otherwise use independent agents on the inherited model and disclose the reduced model diversity. Sequential passes without delegation are not independent agents. Report that gap wherever the upstream workflow requires independent review.
- Writers need separate worktrees or output directories. Local subagents do not acquire isolation merely by being spawned. Review their output before integrating it.
- Include a pointer to this file in every subagent brief. When a brief requests `poteto-agent`, require the child to read this file and `poteto-mode/SKILL.md` in full before work. When it requests `comment-sicko` or `Comment Sicko`, require `poteto-mode/references/portable-agents/comment-sicko.md` instead.
- A missing optional dependency is a limitation to report, not permission to install another plugin, edit its cache, contact people, or publish an upstream PR. If it prevents the requested result, state the blocker. Preserve the user's authorization and the harness's approval rules.
- Upstream autonomy, automatic backlog creation, and countersign language never waive the requested scope, operator gates, host approvals, or an access denial. A no-merge instruction remains binding even when a playbook normally ends by shipping.

## Delegation and lifecycle

The chat receiving poteto-mode remains the playbook runner. Delegate scoped steps to poteto-agent; never delegate the entire playbook runner role. Apply this rule to both native agents and skills-only installations.

Before fan-out, check the exposed tool schema, remaining agent capacity, permitted nesting, available evidence, and execution environment. Count coordinators and live children against any shared limit. Keep the upstream total participant count and distinct scopes. When they exceed capacity, queue the remaining seats and refill as workers finish. A capacity limit changes scheduling, not coverage. Arena's judge starts only after every candidate has finished or been recorded as a dropout.

Fresh agents are not necessarily context-isolated. Arena and Eval candidates receive only their task and allowed grounding, without the parent's rubric, competing outputs, or evaluator instructions. Use a no-history fork or another supported isolated context even when inheriting the model. Give the judge the rubric and sanitized output labels, without candidate model identities or hidden variant labels. If the host cannot isolate this context, report blinding unverified rather than calling the run blinded.

If a child cannot delegate, the parent can run its required exploration, synthesis, or review stages as fresh sibling agents and relay the complete relevant results. Preserve the stage order and reviewer independence. Do not have the author self-certify a gate that requires another agent. When no delegation route exists, sequential passes may provide useful partial work, but the independent-review gate remains unverified.

Use a fresh agent for a fix round, retry, follow-up, or next queue item, with the original brief, later directives, and prior report and branch consolidated. Reuse only for costly live state under the upstream exception. Read status without resuming an idle agent. An interrupt request is not a terminal result. Collect results or establish cancellation before integrating output or cleaning its worktree, and account for unfinished or failed seats as gaps.

A worker in the current execution environment with its own worktree is a fallback for Cursor cloud placement, not a separate VM. Resolve the requested starting branch or SHA and verify the worker's checkout before work. Separate mutable outputs, ports, and runtime state where the task needs them. Follow the host's environment-selection rules for the user's computer or an explicitly requested environment. Do not replace that environment silently or claim VM isolation, remote credentials, or survival after session termination.

For autonomous and orchestrated work, use only exposed wait, notification, and wake mechanisms. If they cannot keep the run alive, report the limitation and preserve a resume checkpoint without claiming monitoring continues. Put an orchestration store or trail in an available writable task directory and report its actual persistence. Reconcile live work from observable status after a restart rather than assuming Cursor's cloud-agent lifecycle applies.

## Comment Sicko and no-comments

Portable Comment Sicko agents are read-only. Upstream `no-comments` expects comment deletions as well as findings, so the parent owns the edit bridge. Give the reviewer the unchanged upstream criteria and the caller's scope. Its report identifies proposed deletions by file and comment range, proposed counts, exact `MUST KILL` symbols, protected keeps, and evidence gaps. It must not claim to have deleted comments.

The parent applies the upstream step-2 acceptance and rejection checks to that report, then applies only accepted comment deletions within scope. Inspect the resulting diff for application-code edits, scope escapes, and protected comments, and report actual deletion and restoration counts. Continue steps 3 through 6 for root-cause fixes, the architect sketch, and constraint-encoding approval. Preserve the one fresh rerun for a rejected report and fail after a second rejection. Findings alone do not complete `no-comments`; read-only user scope leaves the edit steps explicitly unperformed.

If the reviewer cannot obtain a required `/how`, `/why`, lint-rule lookup, or live-path proof, the parent obtains it through authorized tools and sends the evidence to a fresh reviewer. An unavailable check stays an evidence gap, never a guessed keep, kill, or completed review.

## Claude Code

Read [the Claude dispatch contract](claude-dispatch.md) before delegation.

| Cursor instruction | Claude Code action |
| --- | --- |
| `Task`, `generalPurpose` | Available `Agent` or `Task` tool, `general-purpose` agent |
| `poteto-agent` | Plugin agent `pstack:poteto-agent` when installed; otherwise an ad-hoc general-purpose agent with the required reading in its brief |
| `comment-sicko` / `Comment Sicko` | Plugin agent `pstack:comment-sicko` when installed; otherwise a read-only general-purpose agent that reads the bundled comment-sicko reference |
| `AskQuestion` | `AskUserQuestion` when available, otherwise a concise question |
| todolist | Available task tools or a local checklist |
| `environment: cloud`, `cloud_base_branch` | Available worker route, with the placement and starting-ref checks above |
| `readonly` | Explicit read-only scope in the brief; use an enforceable restriction when available |

A skills-only installation does not register plugin agent types or `pstack:` skill names. Invoke `/poteto-mode` (or the installed skill name) and use the ad-hoc agent fallback above.

Use background execution only if the tool supports it, and collect the result before reporting completion. Preserve plugin namespacing when invoking skills.

## Codex

Read [the Codex dispatch contract](codex-dispatch.md) before delegation.

| Cursor instruction | Codex action |
| --- | --- |
| `Task` | Available `spawn_agent` tool |
| `subagent_type` | A brief instructing the child to read the corresponding skill or agent file |
| `run_in_background` | Spawned agents already run concurrently; omit unsupported flags |
| wait / message / stop | Available agent wait, message, and interrupt tools |
| `AskQuestion` | Available user-input tool, otherwise a concise question |
| todolist | Available plan tool or a local checklist |
| `readonly` | Explicit read-only scope in the brief; do not pass unsupported fields |
| cloud worker | Available worker route, with the placement and starting-ref checks above |

If subagents are disabled, explain the sequential fallback and unmet independent-review gates; enabling a feature is not required to read or use the ordinary skills. Model overrides and reasoning effort must match the actual `spawn_agent` schema, including any restrictions on inherited context.

## Setup, paths, and dependencies

For `poteto-help`, explain this fork's installation and runtime behavior using [README_PORTABLE.md](https://github.com/yxhta/pstack/blob/main/README_PORTABLE.md). Upstream's help and guide describe Cursor. Replace `/add-plugin`, Customize, Custom Modes, and Enter or Option+Enter advice with the current host's supported installation and skill invocation. Do not promise a persistent mode. Workflow skills can route automatically here, deslop is bundled, and native plugins can supply startup context through their enabled, trusted hooks. A skills-only installation has no startup hook. Read the runtime model sheet at each dispatch rather than telling the user that every change requires a new chat. Missing roles inherit the session model. Keep upstream's ask-at-most-once setup offer and do not begin a workflow for a help-only question.

Invoke help explicitly with `/pstack:poteto-help` in the Claude plugin or `/poteto-help` in a skills-only installation. On Codex, select the installed `pstack:poteto-help` plugin skill or use `$poteto-help` for project skills. Principles remain supporting resources with `user-invocable: false`; do not promise direct slash-menu access. Apply the delegation, lifetime, optional-dependency, and authorization rules above to the guide's cloud, Plan Mode, `/loop`, and scheduled-maintenance recipes. A tutorial example does not authorize a recurring task or an installation.

Help links to root README and guide files may be absent in a skills-only installation. Read available installed skills first. For missing upstream documentation, use its public `cursor/plugins/blob/<pin>/pstack/` path with the upstream SHA recorded in the bundled deslop provenance. Disclose an unavailable read rather than treating the installed package as live upstream main. Label upstream guide pages as Cursor instructions and apply this adaptation. Link the fork guide for portable installation and runtime differences. Fork-only sync-pstack-upstream lives under `yxhta/pstack`, while deslop's recorded source lives under `cursor-team-kit`; do not invent upstream pstack links for either skill.

For `setup-pstack`, keep the upstream role labels but write the runtime's Markdown model sheet instead of an `.mdc` rule. Start with inherited models; ask about budget and confirm the concrete role choices as upstream requests. Store effort separately as `model @level` only when supported. If available models cannot be enumerated, offer `inherit-parent` rather than requiring invented slugs. Read this sheet at each dispatch.

Generated project skills go under `.claude/skills/` on Claude Code or `.agents/skills/` on Codex. Personal skills go under the corresponding runtime's supported user skill directory. Preserve a user's existing destination when updating a skill. `CLAUDE.md` and `AGENTS.md` replace Cursor-specific instruction files on their respective runtimes.

Cursor's `create-skill` means the available native skill-authoring guidance (`skill-creator` on Codex), or direct authoring with valid `name` and `description` frontmatter when no equivalent is installed. Do not assume `plugin-dev` is installed.

The upstream [deslop instructions](deslop.md) are bundled from the same source pin. Use the installed deslop skill or read this reference before commit. `control-cli` and `control-ui` are not bundled. Run CLI commands and observe their output, or drive a UI with the available browser/computer tools. Report any verification you could not perform.

## Bundled workflow tools

For upstream instructions to read `git show origin/main:pstack/...`, use that command only in an actual pstack source checkout with the requested ref. In a consumer project, read the corresponding installed resource and record its available package version or source pin. Do not assume the consumer's `origin/main` contains pstack or claim that an installed snapshot is upstream's live main.

Preflight each tool's runtime, dependencies, forge access, and writable paths. `watch-pr/watch-pr` and `orch/orch.ts` require Bun and auto-install locked dependencies beside the scripts when absent. Do not trigger this bootstrap in an immutable or unauthorized plugin cache. When dependency installation is authorized, copy the complete scripts directory, including `package.json` and `bun.lock`, to an appropriate writable task directory and run that copy. Missing runtimes, denied installation, or unavailable forge access remain explicit blockers.

- **Babysit.** Resolve the upstream mode before starting the watcher. On GitHub, run the resolved `watch-pr/watch-pr` from the target repository or supply its explicit owner, repo, and PR options. `check` uses `--status-only`; its exit code 0 means the query completed, not that the PR is ready. Read the verdict. A bare invocation polls and belongs to `drive`, not a status-only request. Preserve upstream watcher rearming, frontier, and stopping conditions. Session polling does not establish restart-persistent monitoring.
- **Orchestrate.** Invoke the resolved `orch/orch.ts` with an explicit writable `--store` (or `ORCH_STORE`) and the actual target repository for frontier operations (`--repo` or `ORCH_REPO`). Its frontier discovery requires `gt` and the stacker's Graphite metadata. A `gh` query is not an equivalent frontier implementation. Report that dependency blocked if unavailable; never fabricate a frontier or mark it verified.
- **Multi-phase plan.** Run the installed [portable plan checker](../scripts/check-portable-plan.mjs) with Node 20 or newer and the contract below. It invokes the untouched [upstream checker](../scripts/check-plan.mjs) on the original plan and substitutes only the two Cursor compatibility diagnostics. Do not insert fictional commands or claim the unmodified checker passed.
- **Worktree cleanup.** Replace the Cursor transcript-scanning audit with the [portable worktree audit](../scripts/portable-worktree-audit.py), invoked as `python3 <poteto-root>/scripts/portable-worktree-audit.py --repo <repo> [--base <verified-ref>]`, if Python and the companion are available. Read its JSON evidence. It performs no fetch, history search, or deletion and always leaves usage unknown. Local ancestry alone is not cleanup eligibility. Combine it with separately authorized current usage, dirty-state, and PR/ref-freshness evidence, and hold every unknown candidate. Keep the upstream deletion gates and the host's required approvals; the audit never authorizes removal.

## Portable multi-phase plans

Invoke `node "<installed-skills-root>/poteto-mode/scripts/check-portable-plan.mjs" "<plan.md>"` from any working directory. Keep the upstream plan headings, PR blocks, ten numbered live lanes, screenshot paths, pass predicates, four perf items, evidence requirements, and operator review gates. The companion delegates these structural checks to the installed upstream checker. A reviewed SHA256 pin guards that interface. If the source changes, stop and review its checks and diagnostics before deliberately updating the companion pin and regression tests.

Put exactly one `portable-runtime` fenced JSON object under `### Arm the program` in the first `## Program checklist` section. A contract elsewhere or inside an outer example fence cannot satisfy the compatibility checks. The following example deliberately records an unavailable wake mechanism. It is structurally valid once `skillsRoot` names the real installed skills directory, but execution remains blocked.

```portable-runtime
{
  "version": 1,
  "skillsRoot": "/absolute/path/to/installed/skills",
  "executionPlaybook": "poteto-mode/playbooks/autopilot-stack.md",
  "readAt": ["start", "every-audit"],
  "auditEveryMinutes": 60,
  "wakeMechanism": null,
  "wakeEvidence": null,
  "availableLifetime": "unavailable",
  "requiredLifetime": "persistent",
  "stopWhen": "Every PR has its required evidence, or the operator asks for a hold.",
  "checkpoint": "receipts/program-checkpoint.md"
}
```

Use the actual exposed tool or scheduler name in `wakeMechanism`, with a tool-schema, observed result, or registration receipt reference in `wakeEvidence`. Missing evidence is `null`, never a fabricated receipt. These strings are inert data. The checker does not execute them, resolve evidence references, arm a schedule, or verify the host's capabilities.

`skillsRoot` is absolute or relative to the plan file's directory, never the shell's working directory. It must identify the skills directory containing this companion. Per-skill symlink aliases from the skills CLI are accepted only when the companion and every required resource resolve to the same canonical installed bundle. `executionPlaybook` is one of `poteto-mode/playbooks/autopilot-full.md`, `poteto-mode/playbooks/autopilot-stack.md`, or `poteto-mode/playbooks/orchestrate.md`. The checker requires that file, `swarm/SKILL.md`, and `poteto-mode/playbooks/opening-a-pr.md` to resolve to real files within that canonical installed root. It prints their actual SHA256 digests and the resolved root. These identify the inspected installed snapshot, not live upstream trunk. At start and every hourly audit, read all three plus the control skill and other leaf skills the plan uses. The checker verifies the declaration and resource availability, not that an agent performed those reads.

`availableLifetime` is `unavailable`, `active-session`, or `persistent`. `requiredLifetime` is `active-session` or `persistent`, chosen from the task's actual duration requirements. Use `wakeMechanism: null`, `wakeEvidence: null`, and `availableLifetime: "unavailable"` together when no mechanism is exposed. An active-session wait cannot satisfy a persistent requirement. Name the actual stop condition and a resume checkpoint in `stopWhen` and `checkpoint`. Do not claim monitoring continues after the available lifetime ends.

The contract is mandatory even when the old Cursor marker strings appear. Unknown or duplicate keys, extra contracts, malformed JSON, invalid declarations, and missing installed resources fail closed. Upstream process errors, signals, output/count inconsistencies, or source drift also fail. The companion never normalizes the plan or inserts fake `git show origin/main:` or `/loop 1h` commands.

Read both verdicts. `Portable STRUCTURE PASS` means the upstream structural checks and portable contract passed. Runtime assertions always remain `UNVERIFIED`, including wake evidence, actual resource reads, cadence, lifetime, stopping, checkpoint persistence, and operator approval. Missing wake evidence is reported explicitly. An unavailable wake mechanism or insufficient lifetime adds `Runtime BLOCKED`. Exit 0 means structural acceptance without a declared hard blocker. Exit 1 means an invalid plan/contract or a declared runtime blocker. Exit 2 means the checker itself could not safely complete. None of these outcomes grants permission to execute or merge. Hand back the plan and checker output, and wait for the operator's explicit go.

## Transcript evidence and pickup

This mapping covers every transcript-dependent workflow, including `reflect`, `automate-me`, `recall`, Eval, Session pickup, and `show-me-your-work`. Use supplied transcripts, the active conversation, or authorized history tools exposed by the host, within the user's topic and workspace scope. Do not guess runtime-history paths, search unrelated chats, bypass a denied path, or treat Cursor JSONL as the host's format.

When the original transcript is unavailable, reconstruct a scoped digest from available conversation, reports, branch state, and artifact receipts. Label that digest as reconstructed. For pickup it can establish the resume point, with inherited claims checked on the real artifact. For Eval's chain-following gate or the trail's transcript audit, a digest and a worker's self-report do not prove which tools ran or files were read. Use observable tool records when available; otherwise mark those checks unverified and do not claim the full gate passed. Do not ask blinded candidates to describe their skill-reading chain as a substitute.

Cursor chat URLs, `/goal`, and `/loop` have equivalents only when the session exposes them. Preserve scope, exit predicates, and human gates when adapting them.

`make-bot-ui`, the Benny automation pack, and Cursor-specific tutorial steps require Cursor and are not supported here. Shared scripts can be used only when their dependencies and data formats are available; this mapping does not port their transcript parsers.

## Native startup context

Native plugins provide a read-only SessionStart hook. Skills-only installations do not install hooks. The hook is enabled by default unless the runtime model sheet contains `session hook: off`. A conflicting or unreadable directive suppresses context. The hook does not execute sheet contents, write settings or delegate work. Codex requires hook review and trust through `/hooks`; installation alone does not grant trust. Changed hook definitions require renewed trust. Child agents still need their explicit reading brief.
