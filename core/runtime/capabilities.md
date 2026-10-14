# pstack runtime: host capabilities

pstack was written against one host (Cursor) whose agent loop offers parallel subagents with a
per-subagent model slug. Most hosts offer less. This file is the contract every ported skill follows
when it fans out, asks a question, or writes a task list. Do not read it up front. The `poteto-mode`
bootstrap resolves the profile from `host-binding.md` and `.pstack/host.json`; open this file when a
step needs the ladder below, and keep the resolved profile in working memory.

Nothing here changes what pstack *decides*. It changes only how a decision is *executed*.

## The five capabilities

A skill never asks "am I in Claude Code?". It asks whether a capability is present.

| id | capability | what it means | if absent |
|---|---|---|---|
| `DELEGATE` | spawn a subagent | the host can run a nested agent with its own context window and return a result | run the step inline in a scoped, self-contained pass |
| `PARALLEL` | concurrent delegates | two or more delegates run at once | serialize the fan-out, keep the same count |
| `MODEL_CHOICE` | per-delegate model | the caller picks which model answers | one model, differentiated by role prompt |
| `BACKGROUND` | detached work | a delegate keeps running past the current turn | foreground it and wait |
| `ASK` | structured question | a multiple-choice prompt with typed options | ask in prose, offer numbered options |

Five more matter to individual skills and playbooks:

| id | what it means |
|---|---|
| `TODO` | a visible, host-rendered task list the user watches update |
| `MCP` | tool servers reachable from the agent, and from delegates |
| `TRANSCRIPTS` | the host keeps readable session transcripts for the active workspace |
| `TRIGGER` | an agent run can start from an event or a schedule, with no human present |
| `CHANNEL` | the agent can read and post to a source channel, such as chat or an issue tracker |

`TRIGGER` and `CHANNEL` are explained in `automations.md`. Absent `TRANSCRIPTS`, a skill that mines
history says so and rebuilds context from the repository and the shared record instead.

## Resolving the profile

The bootstrap resolves the profile once, at the start of a pstack session, in this order, and stops
at the first hit.

1. **Declared.** A `pstack-host` block in the project's agent instructions file, or
   `.pstack/host.json`. Written by `/setup-pstack`. Trust it only when its `host` is this host: a
   profile from another host's session is another host's truth, and `pstack doctor` reports it.
   Each capability says whether it was `observed` in a session or taken as a `default` from
   `host-profile.md`. Trust an observed one. Treat a default as the same guess the profile table
   makes, and drop it on its first failure.
2. **Known host.** Match the host against `host-profile.md`; `host-binding.md` carries this host's
   row. That table is the fallback
   for every supported host and is correct out of the box.
3. **Probed.** Unknown host. Assume the floor (`DELEGATE` absent, `ASK` absent, everything
   inline) and raise a capability only after you have used it successfully once in this session.

Never claim a capability you have not seen work. A failed spawn is evidence of absence: record it
for the rest of the session and drop to the degraded path rather than retrying the same call.

## The degradation ladder

Every fan-out step in pstack compiles to one of four tiers. Skills name the tier they need;
this ladder says what to do when the host sits lower.

**Tier 3, full panel.** `DELEGATE + PARALLEL + MODEL_CHOICE`. N delegates, N distinct models, at
once. This is what upstream pstack assumes. Diversity comes from the models.

**Tier 2, single-family panel.** `DELEGATE + PARALLEL`, no model choice. Keep N. Keep the parallelism.
Diversity now has to be manufactured, because N identical models on one prompt collapse to one
answer. Give each delegate a different **stance** from the panel-stance set in `delegation.md`, and
forbid it from reading its siblings' output. A panel of one model wearing four stances is weaker
than four models, and it is far stronger than one delegate. Say so in the synthesis note.

**Tier 1, serial delegation.** `DELEGATE` only. Keep N. Run them one at a time, each with its own
stance, each blind to the others: pass the shared grounding, never a sibling's answer. Cost is
wall-clock, not quality. Drop N to 2 or 3 if the budget is tight, and record the reduction.

**Tier 0, inline personas.** No delegation. The fan-out happens inside one context window, which
means the stances contaminate each other. Mitigate deliberately:
- Write each stance's output to its own file before starting the next. The file is the isolation.
- Do not re-read a previous stance's file until every stance has been written.
- State the stance in the first line of each pass, in the imperative, and hold it to the end.
- Then read all of them together and synthesize.
This is the weakest tier and it is still worth running. Most of pstack's value is the rubric and
the verification gate, not the parallelism.

## Honesty rule

A skill that ran below Tier 3 says so in its output, in one line, naming the tier and what was lost.

> Ran at Tier 1 (serial, single model). Four stances, no cross-model diversity. Convergence
> between stances is weaker evidence than convergence between models.

Do not silently present a Tier 0 self-review as if four models had agreed. The whole point of
pstack is that evidence is real. That applies to evidence about pstack's own process.
