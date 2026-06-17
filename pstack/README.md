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

## make it yours

`poteto-mode` is my style. you may not want exactly that.

type `/automate-me`. it mines your recent transcripts, drafts a `<your-name>-mode` skill from how you've actually worked, and routes through pstack underneath. you keep pstack as the base and end up with your own routing skill alongside `poteto-mode`.

models are configurable too. type `/setup-pstack`. it detects the models you have access to and writes a small always-applied rule mapping each role (code, judgment, the review panels) to a model. every skill reads it and falls back to sensible defaults when the rule is absent, so you override only what you want.

## usage

use `/poteto-mode` at the start of a task. it reads your request, picks from a set of playbooks, and runs the other skills as the steps need them.

### just use `/poteto-mode`

this skill is the main shortcut. i use it whenever i need the agent to do rigorous engineering work. it comes with sixteen playbooks:

| playbook | for |
|---|---|
| investigation | a read-only question. how does x work, why was y built this way, are we sure. |
| bug fix | reproduce a defect, root-cause it, and fix with runtime evidence. |
| perf | trace a measured slowness and improve it against a baseline. |
| hillclimb | sustained, scientific improvement of one metric against a target, looping hypotheses with before/after measurement and one commit per accepted win. |
| runtime forensics | diagnose a live symptom (leak, idle-cpu spin, glitch) from instrumentation. |
| trace forensics | diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot). |
| feature | new or changed behavior, built from a named data shape. |
| refactoring | a behavior-preserving change to structure or shape. |
| prototype | a throwaway sketch to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it. |
| visual parity | pixel-exact ui equivalence between two implementations. |
| authoring a skill | writing or editing a SKILL.md. |
| eval | test how a skill or prompt change affects agent behavior, blinded. |
| autonomous run | drive a long task to completion without stopping. |
| session pickup | resume or take over a prior agent's in-flight work. |
| pause safely | suspend in-flight work cleanly so it can be resumed later. |
| multi-phase plan | work that spans phases or stacked PRs. |

when invoked it:

1. opens a todo list. the first item is reading the inline principles index in the skill.
2. matches your task to a playbook and copies the steps in verbatim.
3. routes to the other skills as the steps fire.
4. writes unslopped replies framed for the consumer and the maintainer.

the full rules and playbooks live in `skills/poteto-mode/SKILL.md`.

`/poteto-mode` works extremely well with cursor's `/loop` command. you can make cursor work for many hours without sacrificing rigor.

## skills

the rest are useful when you want to specifically invoke them:

| skill | use it when |
|---|---|
| `/poteto-mode` | default entry point for any non-trivial task. |
| `/how` | you want a walkthrough of how a subsystem works. |
| `/why` | you want to know why something was built this way. discovers available MCPs at run time and queries each evidence category in parallel (source control, issue tracker, long-form docs, real-time chat, infra observability, error tracking, analytics warehouse). |
| `/recall` | you're starting or resuming work and want your recent context on a topic rebuilt from your own chat history and the shared record, handed back as a tight current-state brief. |
| `/blast-radius` | you have a small-looking change and want to know what else it could break, with the one fact it's safe because of proven by running code, not asserted. |
| `/architect` | you're about to write code that crosses a function boundary and want the caller's usage, types, and module shape settled first. |
| `/arena` | you want N parallel attempts at the same thing, then to grab the best parts of each. |
| `/interrogate` | you have a diff and want four different models to try to break it, including a strict code-quality lens. |
| `/automate-me` | you want your own `-mode` skill, drafted from how you've actually worked. |
| `/setup-pstack` | you want to pick which models pstack uses per role. detects your models and writes a config rule. |
| `/reflect` | a long task landed and you want the recipe captured as a skill edit. |
| `/tdd` | you're fixing a bug and there's a cheap local test path. write the failing test first, then the fix. |
| `/typescript-best-practices` | you're reading or editing typescript. grounds the type-system-discipline principle in syntax. |
| `/figure-it-out` | no bundled playbook fits. designs a rigorous, auditable playbook for the task. |
| `/show-me-your-work` | you want a reviewable decision trail. logs decisions to a tsv you can commit. |
| `/unslop` | you're cleaning up writing. removes AI tells. |

### examples

mostly i type `/poteto-mode` at the start of a task and let it route to a playbook. the other skills fire as the steps need them. a few i reach for directly.

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

## the `poteto-agent` subagent

pstack also ships a subagent that runs my style end to end. spawn it from a parent agent via `subagent_type: "poteto-agent"`. it reads `poteto-mode` in full, including its inline principles index, before doing any work. substituting `generalPurpose` skips that read and drifts.

`/poteto-mode` and `subagent_type: "poteto-agent"` route through the same wrapper.

## principles

twenty short skills, one principle each. `poteto-mode` indexes them inline and reads that index at task start. the standalone files are there so other skills can reference a principle by name, and so the index can point at the full rule for each.

- core: laziness-protocol, foundational-thinking, redesign-from-first-principles, subtract-before-you-add, minimize-reader-load, outcome-oriented-execution, experience-first, exhaust-the-design-space, build-the-lever.
- architecture: boundary-discipline, type-system-discipline, make-operations-idempotent, migrate-callers-then-delete-legacy-apis, separate-before-serializing-shared-state.
- verification: prove-it-works, fix-root-causes, sequence-verifiable-units.
- delegation: guard-the-context-window, never-block-on-the-human.
- meta: encode-lessons-in-structure.

## not shipped here

a few things `poteto-mode` references but doesn't bundle:

- `/deslop` and the `deslop` skill ship in the `cursor-team-kit` plugin.
- `control-cli` (for CLIs and TUIs) and `control-ui` (for browser, Electron, web) ship in `cursor-team-kit` too.
- `/babysit` and `/create-skill` are cursor built-ins.

install `cursor-team-kit` alongside pstack if you want the full set.

## why are there no planning skills?

cursor already has a great plan mode which works great with pstack. but personally, i don't believe in planning. the best spec is code. if you do want to make a plan, `/poteto-mode` covers it, but it's not a default. 

## license

MIT
