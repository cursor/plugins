# pstack reference for Claude Code

Every skill, playbook, principle and delegate. Written for this host: invocations, paths and
capability notes are the ones that actually shipped here.

If you only read one thing, read the top of `USAGE.md`. This file is the depth behind it.

**Contents.** [Skills](#skills) (27) · [Playbooks](#playbooks) (23) · [Principles](#principles) (24) · [Delegates](#delegates) (3)

---

## Skills

You call these directly. The router calls most of them for you when a step needs one.

### `/poteto-mode`

The router. Matches your request to a playbook and runs it.

**Reach for it when** Any non-trivial task. This is the default entry point and usually the only thing you type.

**How to use it well.** Describe the work in plain words, including how you want it proven. It picks the playbook, copies its steps into your task list verbatim, and delegates. It is sticky: it stays on across turns until you say `pstack off`.

**Common mistake.** Reaching past it for a named skill. The router already calls `/how`, `/architect`, `/interrogate` and the rest when a step needs them; calling one yourself skips the playbook that would have sequenced it.

<sub>`.claude/skills/poteto-mode/SKILL.md`</sub>

### `/setup-pstack`

Detects your host, probes what it can really do, writes the config.

**Reach for it when** Once per project, before anything else. Again if skills degrade unexpectedly or you change models.

**How to use it well.** Run it and answer the questions. It writes `.pstack/host.json` (capabilities, tier) and `.pstack/models.md` (role to model). Both override the build-time defaults.

**Common mistake.** Skipping it. Without it pstack runs on build-time guesses about your host rather than what your session can actually do.

<sub>`.claude/skills/setup-pstack/SKILL.md`</sub>

### `/how`

Explains how a subsystem works, at senior-onboarding depth.

**Reach for it when** Before changing unfamiliar code. Also for placement questions: where should this live, which package owns it, is this the right layer.

**How to use it well.** Ask the real question. For a wide subsystem it fans out explorers on separate angles then synthesizes; for a narrow one it answers in a single pass. Output is Overview, Key Concepts, How It Works, Where Things Live, Gotchas.

**Common mistake.** Using it for motivation. `/how` is runtime behaviour; `/why` is intent. Asking `/how` why a threshold is 750ms gets you the mechanism, not the reason.

**Needs** DELEGATE. Claude Code provides it.

<sub>`.claude/skills/how/SKILL.md`</sub>

### `/why`

Finds the intent behind code, cited.

**Reach for it when** A decision looks wrong and you suspect it is not. Regressions, postmortems, data-backed thresholds, 'why did we pick Y'.

**How to use it well.** It discovers the evidence sources available to you and queries them in parallel: source control, issue tracker, long-form docs, chat, observability, error tracking, analytics. Returns a cited read with a Sources Consulted block.

**Common mistake.** Trusting an uncited claim. If a tool server was unreachable the skill says so; that gap is the finding, not a detail to skim.

**Needs** DELEGATE, MCP. Claude Code provides it.

<sub>`.claude/skills/why/SKILL.md`</sub>

### `/teach`

Runs `/how` and `/why` and weaves one plain explanation.

**Reach for it when** You want to genuinely understand a subsystem or a change, not just get past it.

**How to use it well.** Name the thing and your current level. It combines mechanism and history at your pace.

**Common mistake.** Using it when you only need one half. It costs two investigations.

**Needs** DELEGATE, PARALLEL. Claude Code provides it.

<sub>`.claude/skills/teach/SKILL.md`</sub>

### `/recall`

Rebuilds your recent context on a topic from your own history.

**Reach for it when** Starting your day, resuming after a break, or taking over work you half-remember.

**How to use it well.** Name the topic. It mines your recent sessions and the shared record and hands back a tight current-state brief: where things stand, what is verified, what is open.

**Common mistake.** Expecting it where the host keeps no readable transcripts. It will say so and rebuild from the repo instead, which is weaker.

**Needs** TRANSCRIPTS, DELEGATE, PARALLEL. Claude Code provides it.

<sub>`.claude/skills/recall/SKILL.md`</sub>

### `/architect`

Settles types, signatures and module shape before any implementation.

**Reach for it when** Code that crosses a function boundary. Anything where jumping straight to code would lock in the wrong shape.

**How to use it well.** Phases: Ground the problem, Sketch (signatures with `not implemented` bodies), Agree (optional checkpoint with you), Implement against the sketch, Scrap if the architecture turns out wrong. Read the sketch before it implements.

**Common mistake.** Treating the sketch as binding. Phase E exists because sketches are sometimes wrong; scrapping one early is cheaper than implementing it.

**Needs** DELEGATE, PARALLEL, MODEL_CHOICE. Claude Code does not provide all of that, so this skill carries a note in its own file saying how it adapts here.

<sub>`.claude/skills/architect/SKILL.md`</sub>

### `/arena`

N parallel attempts at the same task, pick a base, graft the best of the rest.

**Reach for it when** One attempt would lock in the wrong shape and the design space is genuinely open.

**How to use it well.** Frame the rubric first, since candidates only see the task. It fans out, cross-judges on a different model family, picks a base, then grafts. Read the synthesis note: it records what was grafted and what was rejected.

**Common mistake.** Running it where the answer is knowable. If a prototype could settle it by observation, that is cheaper and more conclusive.

**Needs** DELEGATE, PARALLEL, MODEL_CHOICE. Claude Code does not provide all of that, so this skill carries a note in its own file saying how it adapts here.

<sub>`.claude/skills/arena/SKILL.md`</sub>

### `/swarm`

N parallel workers over separate slices or racing the same brief.

**Reach for it when** Coverage matrices, races, gauntlets, wide exploration. Work that partitions cleanly.

**How to use it well.** Frame the slices, fan out, the parent waits and aggregates into one report. Use it for breadth; use `/arena` when you want competing designs of the same thing.

**Common mistake.** Slices that share state. Give each worker its own directory or worktree, or they will overwrite each other.

**Needs** DELEGATE, PARALLEL. Claude Code provides it.

<sub>`.claude/skills/swarm/SKILL.md`</sub>

### `/interrogate`

Several reviewers try to break your diff from independent angles.

**Reach for it when** A contested design, or a diff you do not trust, before it ships.

**How to use it well.** Give it the diff and state the intent. Reviewers work blind to each other; the lead synthesizes and gives a judgment. Where your host has one model family it uses adversarial stances instead and says so.

**Common mistake.** Reading agreement as safety. Agreement between two passes of one model is not evidence; the output tells you which you got.

**Needs** DELEGATE, PARALLEL, MODEL_CHOICE. Claude Code does not provide all of that, so this skill carries a note in its own file saying how it adapts here.

<sub>`.claude/skills/interrogate/SKILL.md`</sub>

### `/blast-radius`

What else this change could break, proven by running code.

**Reach for it when** A small-looking change you do not fully trust. Reviewing someone else's diff.

**How to use it well.** It looks beyond the diff and then proves the one fact the change is safe because of, by running something rather than asserting it.

**Common mistake.** Accepting a writeup. The skill's own first rule is not to trust its own writeup; the evidence is the run.

<sub>`.claude/skills/blast-radius/SKILL.md`</sub>

### `/no-comments`

Deletes narrating comments and fixes the code they were hiding.

**Reach for it when** Before review, on any diff.

**How to use it well.** It delegates to `comment-sicko`, which is deliberately hostile to comments, then you act on accepted findings. A comment claiming a constraint gets offered as a type, test or lint instead.

**Common mistake.** Letting it strip a comment that encodes a real external constraint. Legal headers, public API docs, and vendor-forced behaviour survive; check the rejects.

**Needs** DELEGATE. Claude Code provides it.

<sub>`.claude/skills/no-comments/SKILL.md`</sub>

### `/unslop`

Cuts AI tells from prose.

**Reach for it when** Any prose surface: replies, docs, PR bodies, commit messages. The router applies it automatically.

**How to use it well.** Point it at the text. It removes the long-dash habit, filler, jargon, and the communication artifacts that make writing read as generated.

**Common mistake.** Expecting it to clean code. It is prose only; `/no-comments` handles code.

<sub>`.claude/skills/unslop/SKILL.md`</sub>

### `/technical-writing`

Four-layer standard for docs a tired engineer understands first read.

**Reach for it when** Docs, RFCs, readmes, PR descriptions, commit messages.

**How to use it well.** Pick the Diatax is mode first, then Google developer style for sentences, STE rules so statements land one at a time, Global English so no sentence has two readings.

**Common mistake.** Applying all four layers to a two-line commit message. Match the layer count to the surface.

<sub>`.claude/skills/technical-writing/SKILL.md`</sub>

### `/tdd`

Makes the broken behaviour executable before you change production code.

**Reach for it when** A bug with a clear, cheap test path. Only when asked, or when the target is obvious.

**How to use it well.** Write the failing test, then fix. Stage commits so the failing repro lands before the fix in history.

**Common mistake.** Forcing it. The skill itself says to skip when the test path is unclear, expensive or integration-heavy.

<sub>`.claude/skills/tdd/SKILL.md`</sub>

### `/figure-it-out`

Designs a bespoke playbook when none of the 23 fits.

**Reach for it when** A large migration, an ambitious multi-part change, or work you will review after stepping away.

**How to use it well.** The deliverable before any code is the workflow itself. It frames, designs phases, runs a hypothesis loop, keeps an audit trail, then verifies.

**Common mistake.** Using it when a narrower playbook fits. Bespoke costs more and proves less than a playbook that has been run many times.

<sub>`.claude/skills/figure-it-out/SKILL.md`</sub>

### `/create-verification-skill`

Generates a project-local way to drive your real app and prove behaviour.

**Reach for it when** Your repo has no scripted way to launch the app, exercise a feature and capture evidence.

**How to use it well.** It interviews the repo rather than you, generates the skill, seeds a feature map, then proves the generated skill before handing it over.

**Common mistake.** Skipping it and letting 'it compiles' stand in for proof. Most of pstack's verification steps assume this exists.

<sub>`.claude/skills/create-verification-skill/SKILL.md`</sub>

### `/maintain-verification-skill`

The upkeep loop for a generated verification skill.

**Reach for it when** Periodically, or when the feature map has drifted from the app.

**How to use it well.** Parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections.

**Common mistake.** Letting the map rot. A stale feature map makes every verification step quietly weaker.

**Needs** DELEGATE, PARALLEL. Claude Code provides it.

<sub>`.claude/skills/maintain-verification-skill/SKILL.md`</sub>

### `/show-me-your-work`

A reviewable decision trail, one row per decision.

**Reach for it when** Long-running or unattended work, or anything you will review after stepping away.

**How to use it well.** A TSV with what, why, evidence, result. Local by default; commit it when a reviewer needs the trail to trust the result. It audits itself against the transcript at the end.

**Common mistake.** Writing it at the end. A trail reconstructed afterwards records what you remember, not what happened.

**Needs** DELEGATE, MODEL_CHOICE. Claude Code does not provide all of that, so this skill carries a note in its own file saying how it adapts here.

<sub>`.claude/skills/show-me-your-work/SKILL.md`</sub>

### `/reflect`

Mines the session for learnings and routes each into a skill edit.

**Reach for it when** After a session that taught you something about how the agent should work.

**How to use it well.** Three reviewers in parallel over the transcript, then a synthesizer that returns Accepted, Rejected and Backlog. Accepted items become concrete edits.

**Common mistake.** Running it on a routine session. Without real friction to mine, it produces noise.

**Needs** DELEGATE, PARALLEL, MODEL_CHOICE. Claude Code does not provide all of that, so this skill carries a note in its own file saying how it adapts here.

<sub>`.claude/skills/reflect/SKILL.md`</sub>

### `/automate-me`

Builds a personal mode skill from your own working history.

**Reach for it when** You want agents to follow how you actually work without describing it.

**How to use it well.** It mines recent transcripts for repeated preferences, asks which patterns are really you, drafts a `-mode` skill, unslops it, and opens a PR.

**Common mistake.** Accepting every mined pattern. It asks for a reason: some habits are accidents, not preferences.

**Needs** TRANSCRIPTS, DELEGATE, PARALLEL. Claude Code provides it.

<sub>`.claude/skills/automate-me/SKILL.md`</sub>

### `/make-bot-ui`

A page you click that wakes an agent over a trigger.

**Reach for it when** You want a dashboard or buttons that start agent work.

**How to use it well.** A local server holds the key and POSTs to the trigger; the browser never sees the key. Bind to 0.0.0.0 and expose over Tailscale. Treat the incoming body as untrusted data.

**Common mistake.** Putting the sender key in the browser or in chat. That publishes it.

**Needs** TRIGGER. Claude Code provides it.

<sub>`.claude/skills/make-bot-ui/SKILL.md`</sub>

### `/bro`

Restates the last message in plain language.

**Reach for it when** An answer was dense or jargon-heavy.

**How to use it well.** Just call it.

**Common mistake.** None. It is one message.

<sub>`.claude/skills/bro/SKILL.md`</sub>

### `/typescript-best-practices`

TypeScript patterns, applied automatically on .ts and .tsx files.

**Reach for it when** Automatic. It attaches when you touch matching files.

**How to use it well.** Nothing to invoke. It builds on the type-system-discipline principle.

**Common mistake.** Assuming it covers design. It covers types; `/architect` covers shape.

<sub>`.claude/skills/typescript-best-practices/SKILL.md`</sub>

### `/benchmark-checklist`

Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it.

**Reach for it when** the description matches.

**How to use it well.** See the skill file.

**Common mistake.** None recorded.

<sub>`.claude/skills/benchmark-checklist/SKILL.md`</sub>

### `/correct`

Find the mistakes agents keep repeating in this repo and make each one impossible.

**Reach for it when** the description matches.

**How to use it well.** See the skill file.

**Common mistake.** None recorded.

<sub>`.claude/skills/correct/SKILL.md`</sub>

### `/poteto-help`

Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task.

**Reach for it when** the description matches.

**How to use it well.** See the skill file.

**Common mistake.** None recorded.

<sub>`.claude/skills/poteto-help/SKILL.md`</sub>

---

## Playbooks

You rarely name a playbook. `/poteto-mode` matches your request to one and copies its steps
into your task list verbatim, so you can see the plan before it runs. A step it decides to skip stays
in the list with a one-line reason.

### `authoring-a-skill`

Writing or editing a SKILL.md.

**Routed to by** Writing or editing a SKILL.md.

**You get** A validated skill with resolving links, plus a PR.

**Worth knowing.** Agent-facing prose has a higher bar than human prose: an unhelpful sentence becomes an instruction some future agent follows.

### `autonomous-run`

Drive a long task to completion without stopping.

**Routed to by** 'Run until done', 'don't stop', 'I'm going to bed'.

**You get** A long task driven to a predicate you can check, with a decision log.

**Worth knowing.** State the exit condition as something checkable before it starts. A vague finish condition is the one thing this playbook cannot work with.

### `autopilot-full`

Run independent PRs to merged, one owner per PR, each head verified at the root.

**Routed to by** 'Autopilot this queue.' Independent PRs, run to merged.

**You get** One owner per PR carrying build through merge, each head verified at the root before it lands.

**Worth knowing.** Grants merge authority. The irreversible-action guard still applies: no deploys, no data deletion, no customer messages.

### `autopilot-stack`

Build and verify one linear base-branch stack for the operator to land.

**Routed to by** 'Build the stack, I'll land it.'

**You get** One linear verified base-branch stack for you to review and merge.

**Worth knowing.** Same loop as autopilot-full minus the merge. No owner merges or arms auto-merge.

### `babysit`

Drive a PR or a stack to merge-ready: conflicts, review threads, CI.

**Routed to by** 'Check on PR X', 'get it green', 'address the review comments'.

**You get** A PR or stack driven to merge-ready.

**Worth knowing.** Works the merge frontier only, never mutates stack topology, and orders work conflicts then review threads then CI.

### `bug-fix`

Reproduce a defect, root-cause it, and fix it with runtime evidence.

**Routed to by** A defect to reproduce and fix. 'Repro first, then fix and verify.'

**You get** A root-caused fix with runtime evidence, commits staged so the failing repro lands before the fix.

**Worth knowing.** Step 1 makes the agent reproduce it itself on the real surface. It will not hand the repro back to you except under one narrow stated exception.

### `eval`

Test how a skill or prompt change affects agent behavior, blinded.

**Routed to by** Does this skill or prompt change actually improve behaviour.

**You get** A blinded verdict from parallel candidates and a judge on a different model family.

**Worth knowing.** It grades from the transcripts, not from what the candidates claim they did.

### `feature`

New or changed behavior, built from a named data shape.

**Routed to by** New or changed behaviour.

**You get** A feature built from a named data shape, verified on the real surface, in small ordered commits.

**Worth knowing.** Step 1 is `/how` over the affected subsystem and step 2 is `/architect`. Skipping either is recorded, not silent.

### `hillclimb`

Sustained improvement of one metric against a target, one commit per accepted win.

**Routed to by** Move one metric to a target over many attempts.

**You get** One commit per accepted win, a decision log of every hypothesis, before and after.

**Worth knowing.** Distinct from perf-issue, which is a one-off fix. Here a plateau is not a stop: it pivots category and keeps going.

### `investigation`

A read-only question: how does X work, why was Y built this way, are we sure.

**Routed to by** How does X work. Why was Y built this way. Are we sure about Z.

**You get** A cited answer in how-shaped sections. No code changes.

**Worth knowing.** Read-only. The throughput checkpoint is explicitly n/a, so it will not pad the answer with work you did not ask for.

### `multi-phase-plan`

Work that spans phases or stacked PRs.

**Routed to by** Work spanning phases or stacked PRs.

**You get** A written plan validated by a script, then executed.

**Worth knowing.** If the change is one or two files with an obvious approach it says so and stops rather than producing a plan you do not need.

### `opening-a-pr`

Open a ready PR from small ordered commits. Invoked at the end of every playbook that ships a code change.

**Routed to by** Automatic. Runs at the end of every playbook that ships a code change.

**You get** A ready PR: small ordered commits, conventional title, briefing-style body.

**Worth knowing.** You will rarely invoke this yourself.

### `orchestrate`

A standing multi-day project under one coordinator: many stacked PRs, fleets of delegates.

**Routed to by** 'Own this migration until it lands.' Multi-day, many stacked PRs.

**You get** A standing program under one coordinator, with a ledger and a rolling window of workers.

**Worth knowing.** Heavier than autonomous-run. Work one agent could finish in a session belongs there, however program-shaped it sounds.

### `pause-safely`

Suspend in-flight work cleanly so it can be resumed later.

**Routed to by** Going offline, restarting, or about to lose context.

**You get** Durable work and a resume note.

**Worth knowing.** It stops at a safe boundary and takes no irreversible action to pause. The complement to session-pickup.

### `perf-issue`

Trace a measured slowness and improve it against a baseline.

**Routed to by** A measured slowness. 'This got slower.'

**You get** A traced fix compared against a baseline, with the measurement cited in the PR.

**Worth knowing.** It captures the baseline before hypothesising. A perf claim without a trace does not pass.

### `prototype`

A throwaway sketch that settles a design or behavioral question by observation.

**Routed to by** Settle a design or behavioural question cheaply. 'Mock it up', 'try this layout'.

**You get** The decision, plus throwaway code you are meant to discard.

**Worth knowing.** This is how pstack answers questions you might otherwise be asked. If observation can settle it, it builds rather than asks.

### `refactoring`

A behavior-preserving change to structure or shape.

**Routed to by** Change the shape without changing behaviour.

**You get** A behaviour-preserving reshape, proven unchanged on the real artifact.

**Worth knowing.** It pins the behaviour contract first and subtracts before it adds. 'It compiles' is not the proof.

### `runtime-forensics`

Diagnose a live symptom (leak, idle-CPU spin, glitch) from instrumentation.

**Routed to by** A live symptom: a leak, idle CPU spin, a visual glitch.

**You get** A diagnosis mapped to file, symbol and line. Not a fix.

**Worth knowing.** It proves the mechanism by instrumenting the running process before believing it.

### `session-pickup`

Resume or take over a prior agent's in-flight work.

**Routed to by** Resuming or taking over in-flight work.

**You get** Reconstructed state, a done-vs-pending diff, and a route to the right playbook.

**Worth knowing.** It verifies the inherited claims against the real artifact rather than trusting the previous agent's summary.

### `shipping`

Independently verify a green stack, then land the contiguous verified run.

**Routed to by** 'Land the stack.'

**You get** The contiguous verified run landed bottom-up.

**Worth knowing.** Green is not safe. Nothing lands without an independent per-PR verdict from an agent that did not write the code.

### `trace-forensics`

Diagnose a captured profiling artifact handed to you after the fact.

**Routed to by** A captured artifact handed to you: cpuprofile, trace, spindump, heap snapshot.

**You get** A cited diagnosis, no fix unless you ask.

**Worth knowing.** It loads the artifact into something queryable rather than eyeballing it, and routes onward to bug-fix or perf-issue once the cause is known.

### `visual-parity`

Pixel-exact UI equivalence between two implementations.

**Routed to by** Pixel-exact equivalence between two implementations, or a styling migration.

**You get** Component-by-component parity verified by image diff.

**Worth knowing.** It establishes the baseline harness before migrating, and holds explicit anti-shortcut clauses: no harness edits, no baseline tampering.

### `worktree-cleanup`

Reclaim disk by pruning merged or abandoned worktrees, safety-gated.

**Routed to by** 'What's using my disk', 'clean up worktrees'.

**You get** Reclaimed disk, safety-gated.

**Worth knowing.** Untracked work is never dropped unattended: never-committed files exist nowhere else, so it shows you the list and waits.

---

## Principles

Not commands. These are the reasoning the router cites when it makes a call, and each one is a file
you can open when you want to know why it decided something. Read one in full before leaning on it.

**`laziness-protocol`** — Bias to deletion and the smallest change that solves the problem. Fires when you are sizing a diff or tempted to add a layer.

**`foundational-thinking`** — Settle core types and data structures before logic, so downstream code becomes obvious.

**`redesign-from-first-principles`** — Integrating a new requirement? Redesign as if it had been foundational from day one, rather than bolting it on.

**`attack-the-premise`** — Two fixes failing the same gate share a premise. Question the premise instead of writing a third fix that assumes it.

**`subtract-before-you-add`** — Remove dead weight first, then build on the simpler base.

**`minimize-reader-load`** — Count the layers between question and answer. Collapse one-caller wrappers, shrink mutable scope.

**`outcome-oriented-execution`** — In a planned migration, converge on the target architecture. Do not preserve throwaway intermediate states.

**`experience-first`** — On product tradeoffs, choose user delight over implementation convenience.

**`exhaust-the-design-space`** — No precedent for this interaction? Build 2 to 3 competing prototypes and compare before committing.

**`build-the-lever`** — Build the tool that does it or proves it, not the thing by hand. The tool is what a reviewer can rerun.

**`model-the-domain`** — Encode the domain in a structure, a state machine, a typed model, a table, rather than scattered conditionals.

**`boundary-discipline`** — Guards at system boundaries. Trust internal types. Keep business logic pure.

**`type-system-discipline`** — Make illegal states unrepresentable. Brand primitives. Parse external data at the boundary.

**`make-operations-idempotent`** — Commands and lifecycle steps run amid crashes and retries. Converge to the same end state.

**`migrate-callers-then-delete-legacy-apis`** — Migrate every caller and delete the old API in one wave, rather than keeping a compatibility layer.

**`separate-before-serializing-shared-state`** — Concurrent actors might write the same file or branch. Eliminate the sharing first.

**`prove-it-works`** — Verify against the real artifact, not a proxy and not 'it compiles'. The most load-bearing principle in pstack.

**`fix-root-causes`** — Trace each symptom to its root. Reproduce first. Resist the nil-check that silences the crash.

**`sequence-verifiable-units`** — Break work into small units that each end in a check, and order delivery so the sequence proves itself.

**`test-behavior-not-implementation`** — Call the code the way its users do. If the test would still pass with every import returning undefined, it is not a test.

**`guard-the-context-window`** — Route bulk to delegates. Keep summaries in the main thread, not raw payloads.

**`never-block-on-the-human`** — On reversible work, proceed and let the human correct afterwards. Reserve asking for the irreversible.

**`encode-lessons-in-structure`** — Writing the same instruction twice? Make it a lint, a check or a script instead of more prose.

---

## Delegates

Sub-agents the skills spawn. You do not usually invoke one yourself.

### `comment-sicko`

Use as the delegate for the no-comments skill: feed it a diff or a file scope, and it hunts narrating comments, suppressions, and workaround code.

**Access** may write. **Model class** `fast`.

### `pstack-reviewer`

Use for a pstack leaf job that reads and reports without editing: /how explorers and explainers, /why investigators and synthesizers, /interrogate reviewers, the /arena cross-judge.

**Access** read-only. **Model class** `deep`.

**Enforced by** `pstack-reviewer` ships with a `tools` whitelist that leaves out `Write`, `Edit` and `NotebookEdit`. That removes the file-editing tools and nothing else: the agent keeps `Bash`, which can write, so the repository boundary is the persona's instruction. A reviewer writes probes only under its own output path.

### `pstack-worker`

Default delegate for any pstack playbook step that writes code or drives a tool.

**Access** may write. **Model class** `fast`.

---

## How they fit together

A normal task is one line to `/poteto-mode`. It reads the runtime layer, matches a playbook,
copies the steps in, and from there the playbook decides which skills run. `/how` grounds it,
`/architect` shapes it, a delegate writes it, `/interrogate` attacks it, and the
verification step proves it against the real artifact rather than a passing build.

The principles are what it cites when it chooses between two reasonable options. The delegates are
who does the work when a step should not run in your main context window.

On Claude Code this runs at **Tier 2**. Anything that fans out says so in its output, and names what it lost.
