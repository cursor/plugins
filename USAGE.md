# Using pstack on Claude Code

Everything below is specific to this host. The engineering method is the same everywhere; how you
reach it is not.

## 1. Install

Install the `pstack` command once (`uv tool install pstack-cli` or `pipx install pstack-cli`), then, in
your project:

```bash
pstack init --host claude
```

It writes only what belongs to Claude Code, backs up any file of yours it would replace, and appends to
your existing instructions file rather than overwriting it. Re-running it is safe and keeps your mode
state. Without pip or uv, run `./install.sh --host claude` from a checkout of pstack instead.

| command | what it does |
|---|---|
| `pstack status` | what is installed, which files you edited, whether the mode is on |
| `pstack update` | refresh to the build this CLI carries, keeping files you edited |
| `pstack on`, `pstack off` | turn the sticky mode on or off for this project |
| `pstack doctor` | diagnose a broken or partial install and say how to fix it |
| `pstack uninstall` | remove what pstack installed and put back what it replaced |
| `pstack uninstall --purge` | also remove `.pstack/`, keeping run records unless you add `--delete-runs` |
| `pstack init --user` | install the skills user-wide instead of into one project |
| `pstack serve` | a live local page of your agent sessions and pstack runs |
| `pstack list`, `pstack show <name>`, `pstack hosts` | the catalogue, one skill or playbook in full, the supported hosts |

Then open a new session and run `/setup-pstack`. It probes what this host can really do and
writes `.pstack/host.json`, which overrides the build-time defaults.

## 2. Your first task

Do not invoke a skill. Describe the work:

```
/poteto-mode the webhook sends two welcome emails for one purchase. Reproduce both
deliveries first, then trace the cause, fix it, and verify one email is sent.
```

The parent agent matches a playbook, exports its steps into your task list **verbatim**, and
delegates by role when the session supports it. The run record supplies checklist state and
completion requirements. Its checker rejects missing required artifacts, failed verdicts, and
stale verification. The agent must run it before claiming completion. A permitted skip stays in
the checklist with its reason; mandatory verification cannot be skipped. A final chat reply alone
does not establish that the run passed its completion check.

## 3. Invoking things here

**Skills.** Type `/name` in the chat input. Claude also loads a skill on its own when the request matches its description, unless the skill is marked manual-invoke only.

**Delegates.** Skills spawn delegates with the `Agent` tool, naming `pstack-worker` or `pstack-reviewer` as the `subagent_type`. Several `Agent` calls in one message run in parallel. Nesting works to three levels by default.

**Read-only enforcement.** `pstack-reviewer` ships with a `tools` whitelist that leaves out `Write`, `Edit` and `NotebookEdit`. That removes the file-editing tools and nothing else: the agent keeps `Bash`, which can write, so the repository boundary is the persona's instruction. A reviewer writes probes only under its own output path.

**Models.** A delegate takes a tier alias (`opus`, `sonnet`, `haiku`, `fable`) at the call site. A predefined agent file may pin a full model ID such as `claude-opus-5`. Every one is a Claude model, which is why panels here are Tier 2 and use stances for the rest of the diversity.

## 4. What is installed, and where

| what | where |
|---|---|
| skills | `.claude/skills/` |
| playbooks | `.claude/skills/poteto-mode/playbooks/` |
| delegate personas | `.claude/agents/` |
| runtime layer | `.claude/skills/pstack-runtime/` |
| always-on instructions | `CLAUDE.md` |
| user guide | `docs/pstack-guide/` |
| automation pack | `automations/benny/` |
| your config | `.pstack/` |

## 5. Tier 2, and what that costs you

Real parallel delegates, but every model comes from one vendor. A panel keeps its count and gets its diversity from **stances** instead of models: `adversary`, `operator`, `maintainer`, `minimalist`, `architect`, `builder`. Weaker than four vendors. Far stronger than one opinion.

Any skill that ran below Tier 3 says so in its output. That line is not boilerplate: convergence
between four models is real evidence, and convergence between two passes of one model in one context
window is not. Read it before you trust an agreement.

## 6. The delegates

| role | access | what it is for |
|---|---|---|
| `comment-sicko` | write | Use as the delegate for the no-comments skill: feed it a diff or a file scope, and it hunts narrating comments, suppressions, and workaround code. |
| `pstack-reviewer` | read | Use for a pstack leaf job that reads and reports without editing: /how explorers and explainers, /why investigators and synthesizers, /interrogate reviewers, the /arena cross-judge. |
| `pstack-worker` | write | Default delegate for any pstack playbook step that writes code or drives a tool. |

You own their work. Read the diff, write your own summary, and treat a "done" as a claim rather than
evidence.

## 7. Configuring which model does what

`/setup-pstack` writes `.pstack/models.md`, one line per role. Delete a line to fall back to
the default; set a role to `inherit` to run it on the parent's model, which is the right answer on
an auto-routing plan.

Panel roles take a **list**, and the list length sets the fan-out. Write real entries: a single bare
token reads as a single delegate and silently collapses a four-way review to one opinion.

## 8. Sticky mode

`/poteto-mode` stays on across turns once entered. The state lives in `.pstack/mode.md` and the
marked block in `CLAUDE.md`. Say "pstack off" to leave. It stands down on its own for
casual questions without announcing it.

## 9. Automations

The `benny` pack triages incoming issue reports and reproduces confirmed bugs, unattended. It needs
a trigger: a cron job or CI workflow invoking `claude -p` with the event payload.

Without a trigger the skills still work; you start them by hand. Read
`.claude/skills/pstack-runtime/automations.md` before enabling anything unattended: it carries the fail-closed
rules that apply when no human is watching the turn.

## 10. Worth knowing on this host

- The build ships a plugin manifest at `.claude-plugin/`. Install it into a project with `pstack init --host claude`, or add the directory as a plugin marketplace and get versioned updates.
- Skills that bundle scripts pre-approve them with `allowed-tools`, so running them does not prompt.

## 11. The skills

Situational. The router calls them for you when a step needs one; this table is for reaching one
directly. A **needs** entry names the capability a skill was written for, and where this host lacks
it the skill carries a note saying how it adapts.

### Workflow

| invoke | for | needs |
|---|---|---|
| `/poteto-mode` | pstack's engineering router. | any host |
| `/setup-pstack` | Detect the current agent host, probe what it can actually do, and write the pstack config that every other pstack skill reads. | any host |
| `/architect` | Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. | DELEGATE + PARALLEL + MODEL_CHOICE |
| `/arena` | Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. | DELEGATE + PARALLEL + MODEL_CHOICE |
| `/automate-me` | Use for "automate me", "create/update/refresh my -mode skill", "turn/capture my preferences or working style into a skill", or wanting agents to follow how the user works. | TRANSCRIPTS + DELEGATE + PARALLEL |
| `/benchmark-checklist` | Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it. | any host |
| `/blast-radius` | Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up. | any host |
| `/bro` | Restate the last message in plain human language, with no jargon. | any host |
| `/correct` | Find the mistakes agents keep repeating in this repo and make each one impossible. | any host |
| `/create-verification-skill` | Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform. | any host |
| `/figure-it-out` | Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. | any host |
| `/how` | Use for "how does X work", code walkthroughs before changing something, and placement / ownership / layering questions ("where should this live", "which package owns this", "is this the right layer"). | DELEGATE |
| `/interrogate` | Use for "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", or "tear this apart". | DELEGATE + PARALLEL + MODEL_CHOICE |
| `/maintain-verification-skill` | Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections. | DELEGATE + PARALLEL |
| `/make-bot-ui` | Use when building a custom UI (page, dashboard, buttons) that should wake an agent over a webhook or trigger, when the user must supply a sender key, or when exposing that UI on Tailscale. | TRIGGER |
| `/no-comments` | Spawn comment-sicko, fix accepted findings, and offer encodings for claimed constraints. | DELEGATE |
| `/poteto-help` | Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. | any host |
| `/recall` | Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight current-state brief. | TRANSCRIPTS + DELEGATE + PARALLEL |
| `/reflect` | Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. | DELEGATE + PARALLEL + MODEL_CHOICE |
| `/show-me-your-work` | Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). | DELEGATE + MODEL_CHOICE |
| `/swarm` | Fan out N parallel workers, drain them, and return one report. | DELEGATE + PARALLEL |
| `/tdd` | Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. | any host |
| `/teach` | Explain a body of work plainly so a person actually understands it. | DELEGATE + PARALLEL |
| `/technical-writing` | Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. | any host |
| auto, on matching files | TypeScript best practices. | any host |
| `/unslop` | Cut AI tells from any writing. | any host |
| `/why` | Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. | DELEGATE + MCP |

### Principles

Reference material. The router cites them; open one directly when you want the reasoning.

`attack-the-premise`, `boundary-discipline`, `build-the-lever`, `encode-lessons-in-structure`, `exhaust-the-design-space`, `experience-first`, `explain-the-number`, `fix-root-causes`, `foundational-thinking`, `guard-the-context-window`, `laziness-protocol`, `make-operations-idempotent`, `migrate-callers-then-delete-legacy-apis`, `minimize-reader-load`, `model-the-domain`, `never-block-on-the-human`, `outcome-oriented-execution`, `prove-it-works`, `redesign-from-first-principles`, `separate-before-serializing-shared-state`, `sequence-verifiable-units`, `subtract-before-you-add`, `test-behavior-not-implementation`, `type-system-discipline`

## 12. The playbooks

The router picks one and copies its steps into your task list. You rarely name one yourself.

| playbook | for |
|---|---|
| `authoring-a-skill` | Writing or editing a SKILL.md. |
| `autonomous-run` | Drive a long task to completion without stopping. |
| `autopilot-full` | Run independent PRs to merged, one owner per PR, each head verified at the root. |
| `autopilot-stack` | Build and verify one linear base-branch stack for the operator to land. |
| `babysit` | Drive a PR or a stack to merge-ready: conflicts, review threads, CI. |
| `bug-fix` | Reproduce a defect, root-cause it, and fix it with runtime evidence. |
| `eval` | Test how a skill or prompt change affects agent behavior, blinded. |
| `feature` | New or changed behavior, built from a named data shape. |
| `hillclimb` | Sustained improvement of one metric against a target, one commit per accepted win. |
| `investigation` | A read-only question: how does X work, why was Y built this way, are we sure. |
| `multi-phase-plan` | Work that spans phases or stacked PRs. |
| `opening-a-pr` | Open a ready PR from small ordered commits. |
| `orchestrate` | A standing multi-day project under one coordinator: many stacked PRs, fleets of delegates. |
| `pause-safely` | Suspend in-flight work cleanly so it can be resumed later. |
| `perf-issue` | Trace a measured slowness and improve it against a baseline. |
| `prototype` | A throwaway sketch that settles a design or behavioral question by observation. |
| `refactoring` | A behavior-preserving change to structure or shape. |
| `runtime-forensics` | Diagnose a live symptom (leak, idle-CPU spin, glitch) from instrumentation. |
| `session-pickup` | Resume or take over a prior agent's in-flight work. |
| `shipping` | Independently verify a green stack, then land the contiguous verified run. |
| `trace-forensics` | Diagnose a captured profiling artifact handed to you after the fact. |
| `visual-parity` | Pixel-exact UI equivalence between two implementations. |
| `worktree-cleanup` | Reclaim disk by pruning merged or abandoned worktrees, safety-gated. |

## 13. If something looks wrong

- **A skill did not appear.** Check it is where section 4 says, and re-run `/setup-pstack`.
- **A panel returned one opinion.** Check `.pstack/models.md`: a panel role needs a list, not one token.
- **Output claims a tier you do not have.** `.pstack/host.json` wins over the build-time defaults. Re-run `/setup-pstack` to re-probe.
- **A delegate wrote something it should not have.** Section 3 says what enforces read-only here. If it is prompt-only, that is the reason.
- **You want it to stop.** Say "pstack off".
