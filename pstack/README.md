# pstack

i'm [poteto](https://x.com/poteto). i'm not a president or ceo, but i've worked with millions of lines of code at Meta, Netflix, and Cursor. i'm also on the react core team where i help build and maintain react compiler.

there's a growing sense that ai writes too much slop code. i agree. i don't want to ship like a team of twenty slop artists. throughput without quality is not a goal i aspire to. if you want to go fast, go deep first. 

**pstack is my answer.** these are the same skills i use everyday to ship high quality code at Cursor. this turns cursor into a real engineering team. the goal is not to maximize loc, in fact it's the opposite. pstack helps you write less, but higher quality code.

**pstack gives you fearless parallelism.** when you can go deep on one agent and trust it to write good, verifiable code, you can truly parallelize with confidence. start multiple agents up with `poteto-mode` and trust that they'll apply rigorous engineering principles to their work.

**cursor gives you the best of all worlds.** every frontier model has its strengths and weaknesses. use any model with pstack. in fact, many of my skills use multi-model workflows to take advantage of each model's unique strengths.

fork it. improve it. make it yours. PRs are welcome! 

## install

```bash
/add-plugin pstack
```

## get started

two steps:

1. run [`/setup-pstack`](./skills/setup-pstack/SKILL.md) and choose which models you want.
2. use [`/poteto-mode`](./skills/poteto-mode/SKILL.md) whenever you're doing anything that requires rigor.

that's it. the other skills are situational; the mode skill uses them for you as needed. out of the box the mode splits work by model strength: your main agent reasons and reviews, precisely-specified code goes to fast code models (cursor grok 4.5 by default), and prose and judgment go to a thinking model. [`/setup-pstack`](./skills/setup-pstack/SKILL.md) changes any of it.

## usage

use [`/poteto-mode`](./skills/poteto-mode/SKILL.md) at the start of a task. it reads your request, picks from a set of playbooks, and runs the other skills as the steps need them.

### just use [`/poteto-mode`](./skills/poteto-mode/SKILL.md)

this skill is the main shortcut. i use it whenever i need the agent to do rigorous engineering work. it comes with sixteen playbooks:

```
/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even when idle. repro
first, then fix and verify.
```

```
/poteto-mode i'm going to bed. land the stack even if ci flakes. i want everything merged by
morning.
```

<details>
<summary>the sixteen playbooks</summary>

| playbook | for |
|---|---|
| [investigation](./skills/poteto-mode/playbooks/investigation.md) | a read-only question. how does x work, why was y built this way, are we sure. |
| [bug fix](./skills/poteto-mode/playbooks/bug-fix.md) | reproduce a defect, root-cause it, and fix with runtime evidence. |
| [perf](./skills/poteto-mode/playbooks/perf-issue.md) | trace a measured slowness and improve it against a baseline. |
| [hillclimb](./skills/poteto-mode/playbooks/hillclimb.md) | sustained, scientific improvement of one metric against a target, looping hypotheses with before/after measurement and one commit per accepted win. |
| [runtime forensics](./skills/poteto-mode/playbooks/runtime-forensics.md) | diagnose a live symptom (leak, idle-cpu spin, glitch) from instrumentation. |
| [trace forensics](./skills/poteto-mode/playbooks/trace-forensics.md) | diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot). |
| [feature](./skills/poteto-mode/playbooks/feature.md) | new or changed behavior, built from a named data shape. |
| [refactoring](./skills/poteto-mode/playbooks/refactoring.md) | a behavior-preserving change to structure or shape. |
| [prototype](./skills/poteto-mode/playbooks/prototype.md) | a throwaway sketch to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it. |
| [visual parity](./skills/poteto-mode/playbooks/visual-parity.md) | pixel-exact ui equivalence between two implementations. |
| [authoring a skill](./skills/poteto-mode/playbooks/authoring-a-skill.md) | writing or editing a SKILL.md. |
| [eval](./skills/poteto-mode/playbooks/eval.md) | test how a skill or prompt change affects agent behavior, blinded. |
| [autonomous run](./skills/poteto-mode/playbooks/autonomous-run.md) | drive a long task to completion without stopping. |
| [session pickup](./skills/poteto-mode/playbooks/session-pickup.md) | resume or take over a prior agent's in-flight work. |
| [pause safely](./skills/poteto-mode/playbooks/pause-safely.md) | suspend in-flight work cleanly so it can be resumed later. |
| [multi-phase plan](./skills/poteto-mode/playbooks/multi-phase-plan.md) | work that spans phases or stacked PRs. |

</details>



when invoked it:

1. opens a todo list. the first item is reading the inline principles index in the skill.
2. matches your task to a [playbook](./skills/poteto-mode/playbooks/) and copies the steps in verbatim.
3. routes to the other skills as the steps fire.
4. writes unslopped replies framed for the consumer and the maintainer.

the full rules and playbooks live in [`skills/poteto-mode/SKILL.md`](./skills/poteto-mode/SKILL.md).

[`/poteto-mode`](./skills/poteto-mode/SKILL.md) is also a sticky mode: once entered it stays on across turns, applying itself when a playbook matches or the task needs rigor and staying out of the way otherwise. opt out any time by saying so.

[`/poteto-mode`](./skills/poteto-mode/SKILL.md) works extremely well with cursor's `/loop` command. you can make cursor work for many hours without sacrificing rigor.

## skills

[`/poteto-mode`](./skills/poteto-mode/SKILL.md) runs most of these for you when a step needs them (`how`, `why`, `architect`, `arena`, `interrogate`, `unslop`, `tdd`, and the principles). the table below is for when you want one directly:

```
/how do we cancel runs? do we have an n+1 when we look up every run to cancel?
```

```
/interrogate review this pr.
```

<details>
<summary>all skills</summary>

| skill | use it when |
|---|---|
| [`/poteto-mode`](./skills/poteto-mode/SKILL.md) | default entry point for any non-trivial task. |
| [`/how`](./skills/how/SKILL.md) | you want a walkthrough of how a subsystem works. |
| [`/why`](./skills/why/SKILL.md) | you want to know why something was built this way. discovers available MCPs at run time and queries each evidence category in parallel (source control, issue tracker, long-form docs, real-time chat, infra observability, error tracking, analytics warehouse). |
| [`/recall`](./skills/recall/SKILL.md) | you're starting or resuming work and want your recent context on a topic rebuilt from your own chat history and the shared record, handed back as a tight current-state brief. |
| [`/blast-radius`](./skills/blast-radius/SKILL.md) | you have a small-looking change and want to know what else it could break, with the one fact it's safe because of proven by running code, not asserted. |
| [`/architect`](./skills/architect/SKILL.md) | you're about to write code that crosses a function boundary and want the caller's usage, types, and module shape settled first. |
| [`/arena`](./skills/arena/SKILL.md) | you want N parallel attempts at the same thing, then to grab the best parts of each. |
| [`/interrogate`](./skills/interrogate/SKILL.md) | you have a diff and want several different models to try to break it, including a strict code-quality lens. |
| [`/automate-me`](./skills/automate-me/SKILL.md) | you want your own `-mode` skill, drafted from how you've actually worked. |
| [`/setup-pstack`](./skills/setup-pstack/SKILL.md) | you want to pick which models pstack uses per role. detects your models and writes a config rule. |
| [`/reflect`](./skills/reflect/SKILL.md) | a long task landed and you want the recipe captured as a skill edit. |
| [`/tdd`](./skills/tdd/SKILL.md) | you're fixing a bug and there's a cheap local test path. write the failing test first, then the fix. |
| [`/typescript-best-practices`](./skills/typescript-best-practices/SKILL.md) | you're reading or editing typescript. grounds the type-system-discipline principle in syntax. |
| [`/figure-it-out`](./skills/figure-it-out/SKILL.md) | no bundled playbook fits. designs a rigorous, auditable playbook for the task. |
| [`/show-me-your-work`](./skills/show-me-your-work/SKILL.md) | you want a reviewable decision trail. logs decisions to a tsv you can commit. |
| [`/unslop`](./skills/unslop/SKILL.md) | you're cleaning up writing. removes AI tells. |

</details>



### examples

mostly i type [`/poteto-mode`](./skills/poteto-mode/SKILL.md) at the start of a task and let it route to a playbook. the other skills fire as the steps need them. a few i reach for directly.


<details>
<summary>all the examples</summary>

```
bug fix:           /poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even
                   when idle. repro first, then fix and verify.
perf:              /poteto-mode a big list takes a second or two to load even though we virtualize.
                   run a cpu trace and tell me why.
feature:           /poteto-mode build a small feature behind a feature flag. verify it really works.
prototype:         /poteto-mode build two prototypes of the markdown renderer so we can compare.
                   spawn an agent for each.
multi-phase:       /poteto-mode open source these skills as a plugin. nothing internal leaks, work
                   in a temp dir, show me the dependency graph first.
overnight run:     /poteto-mode i'm going to bed. land the stack even if ci flakes. i want
                   everything merged by morning.
visual parity:     /poteto-mode the row spacing is too tall when this flag is on. the second image
                   is correct. repro and fix until it matches.
figure it out:     /poteto-mode i'm stepping away. migrate every caller from the synchronous store
                   to the new async one, keeping behavior identical. i want to trust it was done
                   right when i'm back.
how:               /how do we cancel runs? do we have an n+1 when we look up every run to cancel?
why:               /why is this feature flag not on yet?
architect:         design this instrumentation to be high signal with no false positives. /architect
                   this first.
arena:             /arena take my prompt to the arena verbatim. i want to compare their proposals
                   with yours.
interrogate:       /interrogate review this pr.
tdd:               /tdd implement
unslop:            can we unslop and tighten the new changes?
reflect:           /reflect that took too long. capture what we learned so the next run doesn't
                   repeat it.
show-me-your-work: /show-me-your-work keep a decision trail i can review when i'm back.
automate-me:       /automate-me
```

</details>

## the `poteto-agent` subagent

pstack also ships a subagent that runs my style end to end. spawn it from a parent agent via [`subagent_type: "poteto-agent"`](./agents/poteto-agent.md). it reads `poteto-mode` in full, including its inline principles index, before doing any work. substituting `generalPurpose` skips that read and drifts.

[`/poteto-mode`](./skills/poteto-mode/SKILL.md) and [`subagent_type: "poteto-agent"`](./agents/poteto-agent.md) route through the same wrapper.

## principles

twenty-one short skills, one principle each. `poteto-mode` indexes them inline and reads that index at task start. the standalone files are there so other skills can reference a principle by name, and so the index can point at the full rule for each.

- core: [laziness-protocol](./skills/principle-laziness-protocol/SKILL.md), [foundational-thinking](./skills/principle-foundational-thinking/SKILL.md), [redesign-from-first-principles](./skills/principle-redesign-from-first-principles/SKILL.md), [subtract-before-you-add](./skills/principle-subtract-before-you-add/SKILL.md), [minimize-reader-load](./skills/principle-minimize-reader-load/SKILL.md), [outcome-oriented-execution](./skills/principle-outcome-oriented-execution/SKILL.md), [experience-first](./skills/principle-experience-first/SKILL.md), [exhaust-the-design-space](./skills/principle-exhaust-the-design-space/SKILL.md), [build-the-lever](./skills/principle-build-the-lever/SKILL.md).
- architecture: [model-the-domain](./skills/principle-model-the-domain/SKILL.md), [boundary-discipline](./skills/principle-boundary-discipline/SKILL.md), [type-system-discipline](./skills/principle-type-system-discipline/SKILL.md), [make-operations-idempotent](./skills/principle-make-operations-idempotent/SKILL.md), [migrate-callers-then-delete-legacy-apis](./skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md), [separate-before-serializing-shared-state](./skills/principle-separate-before-serializing-shared-state/SKILL.md).
- verification: [prove-it-works](./skills/principle-prove-it-works/SKILL.md), [fix-root-causes](./skills/principle-fix-root-causes/SKILL.md), [sequence-verifiable-units](./skills/principle-sequence-verifiable-units/SKILL.md).
- delegation: [guard-the-context-window](./skills/principle-guard-the-context-window/SKILL.md), [never-block-on-the-human](./skills/principle-never-block-on-the-human/SKILL.md).
- meta: [encode-lessons-in-structure](./skills/principle-encode-lessons-in-structure/SKILL.md).

## not shipped here

a few things `poteto-mode` references but doesn't bundle:

- `/deslop` and the `deslop` skill ship in the `cursor-team-kit` plugin.
- `control-cli` (for CLIs and TUIs) and `control-ui` (for browser, Electron, web) ship in `cursor-team-kit` too.
- `/babysit` and `/create-skill` are cursor built-ins.

install `cursor-team-kit` alongside pstack if you want the full set.

## why are there no planning skills?

cursor already has a great plan mode which works great with pstack. but personally, i don't believe in planning. the best spec is code. if you do want to make a plan, [`/poteto-mode`](./skills/poteto-mode/SKILL.md) covers it, but it's not a default. 

## make it yours

`poteto-mode` is my style. you may not want exactly that.

type [`/automate-me`](./skills/automate-me/SKILL.md). it mines your recent transcripts, drafts a `<your-name>-mode` skill from how you've actually worked, and routes through pstack underneath. you keep pstack as the base and end up with your own routing skill alongside `poteto-mode`.

models are configurable too. type [`/setup-pstack`](./skills/setup-pstack/SKILL.md). it detects the models you have access to and writes a small always-applied rule mapping each role (code, judgment, the review panels) to a model. every skill reads it and falls back to sensible defaults when the rule is absent, so you override only what you want.

## automations

pstack also ships a dormant [benny automation pack](./automations/benny/). benny triages slack issue reports, then reproduces and fixes confirmed bugs with real ui evidence. its files are not registered as slash skills.

to set it up, point cursor at [`FOR_AGENTS.md`](./automations/benny/FOR_AGENTS.md). setup copies the pack into the target repository at `.cursor/automations/benny/`, enables pstack there for shared skills, and keeps user configuration outside the copied pack.

## license

MIT
