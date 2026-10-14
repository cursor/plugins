# pstack runtime: the delegation protocol

Upstream pstack spells its fan-out in one host's vocabulary:

> ```yaml
> subagent_type: generalPurpose
> model: grok-4.6-fast-xhigh
> readonly: true
> run_in_background: true
> ```

None of those four keys exist on every host. This file replaces them with four host-neutral
fields, and gives the concrete call for each supported host. Ported skills state intent in these
fields. The host adapter turns them into a real call.

## The delegate spec

Every delegation in pstack is fully described by these fields.

```yaml
role:      how-explorer        # names the job. Maps to a model via roles.md.
count:     3                   # how many. 1 unless the step is a fan-out.
stance:    <see below>         # required when count > 1 and MODEL_CHOICE is absent.
access:    read | write        # read = no mutations. write = may edit the tree.
tools:     inherit | none | [list]
isolation: none | dir | worktree
location:  local | remote          # which machine runs it, not which directory
output:    <path or "response">
base:      <branch a delegate starts from, when not the current one>
parallel:  yes | no
detached:  yes | no
```

Two fields carry most of the portability weight.

**`access`** replaces the host's `readonly`. Upstream warns repeatedly that `access: read` strips
MCP, so investigation skills must run in write mode while being told not to write. That is a
Cursor-specific defect and it does not port. Say `access: read` and mean it: the delegate may
call tools, including MCP tools, and may not mutate the tree. On hosts where the read-only mode
also removes tool servers, prefer write mode plus an explicit "do not modify any file" line in
the prompt, and note it. Correctness of the *instruction* is portable; enforcement is not.

**`isolation`** replaces the scattered worktree advice. `dir` means each delegate owns a distinct
output directory. `worktree` means each owns a git worktree. It exists so the
`separate-before-serializing-shared-state` principle survives on hosts with no worktree support:
fall back from `worktree` to `dir`, never to shared.

**`location`** is a different question from `isolation`, and collapsing the two loses real meaning.
`remote` means the delegate runs off this machine, so it cannot reach the local transcript store,
simulators, local IDE state, or auth that exists only here; its brief must inline what it needs or
point at repository paths. `local` means it runs here and can reach all of that. Cursor expresses
this natively. Elsewhere `remote` means a cloud runner or a CI job, and where neither exists, say so
and run `local` rather than claiming an isolation you did not get.

## Panel stances

Needed at Tier 2 and below, where every delegate runs the same model and would otherwise return
the same answer. Assign one stance per delegate. They are adversarial on purpose.

| stance | its job |
|---|---|
| `builder` | the straightforward, idiomatic solution. The baseline everything else is measured against. |
| `minimalist` | the smallest change that solves the stated problem. Deletes before adding. Challenges whether the work is needed at all. |
| `architect` | optimizes for the second and third change to this code, not this one. Names the boundary. |
| `adversary` | assumes the change is wrong. Hunts the input, ordering, or failure mode that breaks it. |
| `operator` | assumes it shipped and broke at 3am. Cares about observability, rollback, migration, idempotence. |
| `maintainer` | reads it cold in six months with no context. Cares about reader load and naming. |

Pick stances that fit the artifact. A design bakeoff wants `builder / minimalist / architect /
adversary`. A review panel wants `adversary / operator / maintainer` plus one code-quality lens.
Never assign two delegates the same stance: that is a wasted delegate.

## Host bindings

The same spec, rendered per host. `<prompt>` is the delegate's full instruction text.

### Claude Code

```
Agent(
  subagent_type: "pstack-worker" | "pstack-reviewer" | "general-purpose",
  description: "<3-5 words>",
  model: <tier alias: opus | sonnet | haiku | fable>,  # omit for inherit
  prompt: "<prompt>",
  run_in_background: <detached>,
  isolation: "worktree"                          # when isolation: worktree
)
```
`access: read` maps to the `pstack-reviewer` agent. Its `tools` whitelist leaves out `Write`, `Edit`
and `NotebookEdit`, and that is all the platform enforces. The agent keeps `Bash`, and Bash can
write anywhere, so the repository boundary holds by the persona's instruction, not by the platform.
A reviewer that needs to run a probe writes it under the `output` path it was given and nowhere
else. Anything a reviewer wrote outside that path is a defect in the run.

`isolation: worktree` maps to the `Agent` tool's own `isolation: "worktree"` parameter, which gives
the delegate a fresh git worktree, removed automatically if it makes no changes. Use it for every
write delegate in a fan-out when the project is a git repository. Fall back to `dir` only when it is
not one, and say so.

Two different `model` fields, and the difference matters for panels. The **`Agent` tool's per-call
override** takes tier aliases only (`opus`, `sonnet`, `haiku`, `fable`). A **subagent definition
file's `model:` frontmatter** takes those aliases *or a full model ID* such as `claude-opus-5`,
the same values `--model` accepts. So a panel can get real per-delegate model variation by
predefining several agent files, each pinned to a different model ID, rather than only varying a
tier at the call site.

It is still Tier 2, because every one of those IDs is a Claude model. Tier 3 means different model
*families*, and no Claude Code surface can address a non-Anthropic model. Stances remain the way to
manufacture the rest of the diversity. Multiple `Agent` calls in one assistant message run in
parallel.

### Codex CLI

**Native subagents, on by default.** Codex delegates in-process. No shell, no quota dialog. Use
this path first.

1. **Native delegation.** Ask for the work to be delegated to a subagent (`/agent` in the
   interactive CLI). `agents.enabled` defaults to true, so this works out of the box.
   `agents.max_concurrent_threads_per_session` caps how many run at once, which is where
   `parallel` comes from. A spawn may name its own model and reasoning effort, overriding
   `agents.default_subagent_model` and `agents.default_subagent_reasoning_effort`.
   That makes `MODEL_CHOICE` real but single-vendor: you pick a model per delegate, all OpenAI,
   so a panel gets genuine model variation and not cross-vendor diversity. Treat it as partial.
   **Naming a persona.** Codex has no named-subagent-definition primitive, so a role does not
   resolve by name here the way it does on Claude Code or Cursor. The persona files still ship, at
   `personas/` beside this file. To delegate as `pstack-worker`, `pstack-reviewer` or
   `comment-sicko`, read that persona's file and put its contents at the top of the spawn's prompt,
   then append the task. A spawn without the persona is a generic assistant and will drift from the
   playbook, which is the whole reason the roles exist.

2. **Headless fallback: `codex exec`.** The docs confirm native subagents for the interactive CLI,
   the IDE and app chat, and do **not** confirm them under `codex exec`; non-interactive runs also
   fail any action that needs a fresh approval. So in a headless or CI context, fall back to one
   backgrounded `codex exec -C <dir> "<prompt>"` per delegate, each writing to its own output path.
   Confirm with the operator before spawning more than two, since it spends quota.
   Avoid `--skip-git-repo-check` outside a git repository: it can walk the tree and act on
   unrelated child repositories (openai/codex#15541). Point `-C` at a real repo instead.
3. **Inline personas.** Only if `agents.enabled` is false and no shell is available. Tier 0 per
   `capabilities.md`: sequential stance passes, each written to its own file before the next.

### GitHub Copilot

Custom agents plus subagents, and a model picker that spans vendors. This is the only host besides
Cursor that reaches a genuinely cross-vendor panel.

A delegate is a custom agent at `.github/agents/<name>.agent.md`. Its `tools:` list is a whitelist
drawn from the canonical tool sets — `agent`, `browser`, `edit`, `execute`, `read`, `search`,
`web` — not individual ids. A scoped id (`read/readFile`, `execute/runInTerminal`, `web/fetch`) is
also valid, and so is an MCP tool addressed as `<server>/*`. An unrecognized id is **silently
ignored**, which is how a delegate quietly loses the one capability it needed: `read/readFile`
lives under the `read` set, and `search` does not read file contents, it only searches. An agent
may pin its own `model:`, so `deep` and `fast` resolve to different real models rather than to
stances.

Two things gate this in practice. The orchestrating side needs the `agent` tool available to invoke
a subagent at all, and subagent support is newer than the rest of this table. Confirm both in the
session before promising a panel, and fall back to the stance ladder if either is missing.

Prompt files (`.prompt.md`) are deprecated and are not loaded by Agent Host. Skills are the current
container, which is why this host now uses the same `SKILL.md` layout as the others. A supporting
file is loaded only when referenced with a **Markdown link**; a bare backticked path is inert prose.

**Calling a subagent.** There is no separate delegation API: a subagent is invoked in natural
language, in the parent's own turn. `Run the pstack-reviewer agent as a subagent to <task>.` For a
wave of parallel delegates, list every task in one message under a heading such as `Perform these
in parallel:` rather than issuing them one call at a time. Name a model to steer that delegate's
`deep` or `fast` resolution: `... with <Model Name>.` A subagent call is synchronous and stateless: it
runs to completion before the parent's turn continues, and it starts with no memory of a prior
call. `detached: yes` has no meaning from inside a subagent call; it is not available here.

### generic (unknown host)

Assume no delegation. Run at Tier 0 until you have spawned a delegate successfully in this session,
then raise the tier and say so in the output. Never assume a capability from the host's name.

### Cursor

Native. The spec maps back to `subagent_type` / `model` / `readonly` / `run_in_background`
one-to-one. This is the reference binding.

## Reaching a routed skill

Nearly every skill here carries `disable-model-invocation` (or its per-host equivalent), because
upstream reserves them for deliberate use rather than letting them fire on a casual turn. On hosts
that honor that flag it stops the **model** from auto-loading the skill. It does not stop you
reading the file.

So when a playbook says "the **how** skill" or "run `/interrogate`", that is not a slash command you
issue. **Open the skill's `SKILL.md` at the path in `host-binding.md` and follow it**, exactly as
you would a playbook. A routed skill is a document, not a command.

Only the human types `/name`. If you find yourself concluding that a step is unreachable because a
skill is marked manual-invoke, you have misread this: read the file.

The one real exception is a skill that ships an executable script. Run the script; the flag governs
loading the skill's instructions, not running its tools.

**Read the whole file.** Open a routed skill's `SKILL.md` in full, never a line range. Its later
phases define the outputs the earlier ones build toward. A run that read the first sixty lines of
arena never saw the section asking for a synthesis note, and produced none.

**A skill that delegates is run by you, not handed to a delegate.** `how`, `why`, `architect`,
`arena`, `interrogate` and `swarm` each spawn delegates of their own. A delegate cannot reliably do
that: `pstack-reviewer` has no delegation tool, and most hosts allow one level of nesting at most.
So never brief a delegate with "read the how skill and follow it". Open the skill yourself,
orchestrate its fan-out yourself, and give each delegate one leaf job from it (an explorer angle, an
investigator category, a runner, a judge) on the model that role names in `.pstack/models.md`.
Handing a delegate a whole orchestrating skill collapses its pipeline into one pass on the wrong
model, and the synthesis step the skill was built around never runs.

**Every leaf brief states its boundary.** Name the inputs by path, the one deliverable, the output
path, and where the result returns. Say that the delegate is a leaf: it does not open an
orchestrating skill and does not spawn. A brief without that boundary invites a worker to rebuild
the whole router serially inside one job.

**Pass reference files by path. Never paraphrase one.** When a skill says a delegate gets
`references/<name>.md`, the delegate's prompt opens with that file's absolute path and the
instruction to read it first. Your framing comes after it. It may narrow the task, and it may not add
a deliverable the reference does not ask for. A brief rewritten from memory is how a design-sketch
fan-out turned into four full implementations.

## Rules that hold on every host

- **One message, N spawns.** Where parallelism exists, issue every delegate of a wave in a single
  message. A wave issued one call per message serializes silently.
- **Pointers, not payloads.** Pass a delegate file paths and a task. Never paste a large file into
  its prompt. This is `guard-the-context-window`, and it is the reason delegation exists.
- **Own the output.** Read the delegate's diff. Write your own summary. Never pass its report
  through as your own words. A "done" from a delegate is a claim, not evidence.
- **Fresh over resumed.** A resumed delegate silently drops earlier directives on several hosts.
  Spawn a new one with consolidated scope instead.
- **Degrade loudly.** Every skill that fans out reports the tier it actually ran at.
- **Ask the question, not the answer.** A brief states what to find out. It does not state the
  conclusion you expect, name the premise you want confirmed, or hand over a fact for the delegate to
  repeat back. A fact you hold and want checked goes under a separate "Verify independently" heading.
  A conclusion the delegate was handed is not a finding, and a panel handed one converges on it and
  calls the convergence independent.
- **Blind siblings.** A delegate in a fan-out never reads a sibling's output, and its brief says so.
  A judge sees the rubric and the candidates, not your measurements of them.

## Bounds and recovery

A delegate is bounded before it is spawned. Its brief carries four limits, and the parent enforces
them.

- **Width.** The count is explicit: the configured list length, or the number the skill states. A
  skill that says to spawn more widens only as far as the configured roster, and the run says why.
- **Result requirement.** The brief names the deliverable and where it lands: a file path, or a
  report with named sections. A return without it is a failed attempt, not a thin success.
- **Time budget.** Defaults: 10 minutes for an explorer or investigator, 15 for a runner, judge or
  reviewer, 30 for one implementation. Past the budget with no result, cancel it where the host
  can. On Claude Code, stop the background task. On Codex headless, end the `codex exec` process.
  A Copilot subagent call runs synchronously and cannot be cancelled from the parent, so scope it
  smaller instead. A cancelled delegate counts as a `timeout`.
- **One retry.** A failed or timed-out delegate gets one fresh spawn, with the failure named and the
  scope narrowed. A second failure is final. Drop it and continue with one fewer where the skill
  allows (arena, interrogate, swarm). Otherwise run the step inline at Tier 0 and say so, or stop
  and report the step incomplete. Never loop.

With a run record, each spawn is `rr delegate --job <job> --status launched --role <role> --model
<model> --budget <minutes>`, and each outcome is `rr delegate --job <job> --status
returned|failed|timeout|cancelled|dropped --reason "<why>"`. The record refuses a third attempt at one
job. `rr check` fails while a delegate is still open, and while one ended in failure with no retry
and no drop.

**When work stops.** An exhausted budget, a pause, or a lost session leaves a resume point, not
silence. `rr pause --next "<first action on resume>"` records the step reached, the open delegates,
and the next action, and `rr resume` reads it back in a fresh session. Without a run record, write
the same three things per the Pause safely playbook. A run that stopped reports itself incomplete
with its resume point. It never reports a step it did not reach as done.
