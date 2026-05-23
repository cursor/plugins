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

## usage

use `/poteto-mode` at the start of a task. it reads your request, picks from a set of playbooks, and runs the other skills as the steps need them.

### just use `/poteto-mode`

this skill is the main shortcut. i use it whenever i need the agent to do rigorous engineering work. it comes with seven playbooks. investigation, bug fix, perf, feature, authoring a skill, eval, and multi-phase plan. when invoked it:

1. opens a todo list. the first item is reading the inline principles index in the skill.
2. matches your task to a playbook and copies the steps in verbatim.
3. routes to the other skills as the steps fire.
4. writes unslopped replies.

the full rules and playbooks live in `skills/poteto-mode/SKILL.md`.

`/poteto-mode` works extremely well with cursor's `/loop` command. you can make cursor work for many hours without sacrificing rigor.

the rest are useful when you want to specifically invoke them:

| skill | use it when |
|---|---|
| `/poteto-mode` | default entry point for any non-trivial task. |
| `/how` | you want a walkthrough of how a subsystem works. |
| `/why` | you want to know why something was built this way. discovers available MCPs at run time and queries each evidence category in parallel (source control, issue tracker, long-form docs, real-time chat, infra observability, error tracking, analytics warehouse). |
| `/architect` | you're about to write code that crosses a function boundary and want the types and module shape settled first. |
| `/arena` | you want N parallel attempts at the same thing, then to grab the best parts of each. |
| `/interrogate` | you have a diff and want four different models to try to break it. |
| `/automate-me` | you want your own `-mode` skill, drafted from how you've actually worked. |
| `/reflect` | a long task landed and you want the recipe captured as a skill edit. |
| `/tdd` | you're fixing a bug and there's a cheap local test path. write the failing test first, then the fix. |
| `/typescript-best-practices` | you're reading or editing typescript. grounds the type-system-discipline principle in syntax. |
| `/unslop` | you're cleaning up writing. removes AI tells. |

### examples

mostly i type `/poteto-mode` at the start of a task and let it route to a playbook. the other skills fire as the steps need them. a few i reach for directly.

- **bug fix.** `/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even when idle. repro first, then fix and verify.` repros before touching code.
- **perf.** `/poteto-mode a big list takes a second or two to load even though we virtualize. run a cpu trace and tell me why.` profiles before guessing.
- **feature.** `/poteto-mode build a small feature behind a flag. an ascii pet follows the cursor and reacts on hover.` names the data shape first, then builds.
- **prototype.** `/poteto-mode build two prototypes of the markdown renderer so we can compare. spawn an agent for each.` builds both in parallel so you pick.
- **multi-phase.** `/poteto-mode open source these skills as a plugin. nothing internal leaks, work in a temp dir, show me the dependency graph first.` hands back the catalogue before writing anything.
- **overnight run.** `/poteto-mode i'm going to bed. land the stack even if ci flakes. i want everything merged by morning.` runs unattended, doesn't block on you, pairs with `/loop`.
- **visual parity.** `/poteto-mode the row spacing is too tall when this flag is on. the second image is correct. repro and fix until it matches.` fixes against the reference image until they line up.
- **`/how`.** `/how do we cancel runs? do we have an n+1 when we look up every run to cancel?` a walkthrough of the subsystem with your question answered.
- **`/why`.** `/why is this feature flag not on yet?` fans out across source control, tickets, chat, and infra to recover the reasoning.
- **`/architect`.** `design this instrumentation to be high signal with no false positives. /architect this first.` grounds with `/how`, then fans out parallel design sketches before any code.
- **`/arena`.** `/arena take my prompt to the arena verbatim. i want to compare their proposals with yours.` several models attempt the same task in parallel, then the best parts merge.
- **`/interrogate`.** `/interrogate review this pr.` several models try to break the diff before it ships.
- **`/tdd`.** `/tdd implement` writes the failing test first, then the code to pass it.
- **`/unslop`.** `can we unslop and tighten the new changes?` strips the ai tells out of the prose.
- **`/reflect`.** `/reflect that took too long. capture what we learned so the next run doesn't repeat it.` mines the finished session for lessons and folds them into the right skills.
- **`/automate-me`.** `/automate-me` mines your history and drafts your own `-mode` skill that routes through pstack.

## the `poteto-agent` subagent

pstack also ships a subagent that runs my style end to end. spawn it from a parent agent via `subagent_type: "poteto-agent"`. it reads `poteto-mode` in full, including its inline principles index, before doing any work. substituting `generalPurpose` skips that read and drifts.

`/poteto-mode` and `subagent_type: "poteto-agent"` route through the same wrapper.

## principles

eighteen short skills, one principle each. `poteto-mode` indexes them inline and reads that index at task start. the standalone files are there so other skills can reference a principle by name, and so the index can point at the full rule for each.

- core: laziness-protocol, foundational-thinking, redesign-from-first-principles, subtract-before-you-add, minimize-reader-load, outcome-oriented-execution, experience-first, exhaust-the-design-space.
- architecture: boundary-discipline, type-system-discipline, make-operations-idempotent, migrate-callers-then-delete-legacy-apis, separate-before-serializing-shared-state.
- verification: prove-it-works, fix-root-causes.
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
