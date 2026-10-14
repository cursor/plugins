# pstack runtime: roles and model classes

Upstream pstack defaults to `claude-opus-5-5-xhigh` for judgment and prose and
`grok-4.7-xhigh-fast` for code. These identifiers belong to Cursor's model catalog;
other hosts resolve the same roles against their own available models.

This file replaces slugs with **classes**. Skills name a role. A role resolves to a class. A class
resolves to whatever the current host actually offers.

## The three classes

| class | use it for | what it optimizes |
|---|---|---|
| `deep` | judgment, prose, design, gnarly concurrency, subtle algorithms, synthesis, final review | reasoning quality at the cost of speed and price |
| `fast` | mechanical edits, precisely specified sequences, wide exploration, bulk reads | throughput and cost |
| `balanced` | anything that is neither, and the default when a role is unmapped | the host's normal working model |

A fourth pseudo-class, `panel`, means "a list of distinct models". Its default is two confirmed models, one `deep` and one `fast`, matching upstream.
A configured list overrides the default width. Where the host has only one, `panel` degrades to one model
plus the stance set in `delegation.md`, and the skill reports the degradation.

`inherit` means: do not specify a model, run on the parent's. `inherit-parent` and `auto` are equivalent aliases. It is always valid, on every host,
and it is the correct value for a user on an auto-routing plan.

## Role table

Ported skills reference the role name only.

| role | class | used by |
|---|---|---|
| `feature`, `refactoring` | `fast` | Feature and Refactoring playbooks |
| `bug-fix` | `fast` | Bug fix playbook |
| `perf-issue` | `fast` | Perf playbook |
| `hillclimb` | `fast` | Hillclimb playbook |
| `judgment-and-prose` | `deep` | replies, docs, PR bodies, technical-writing |
| `hardest-tasks` | `deep` | cross-cutting design, concurrency, subtle algorithms |
| `how-explorer` | `fast` | `/how` step 2a |
| `how-explainer` | `deep` | `/how` steps 2b and 3 |
| `why-investigators` | `fast` | `/why` evidence gathering |
| `why-synthesizer` | `deep` | `/why` synthesis |
| `reflect-tooling` | `fast` | `/reflect` tooling reviewer |
| `reflect-judgment` | `deep` | `/reflect` judgment, divergent, synthesizer |
| `arena-runners` | `panel` | `/arena` phase B |
| `arena-cross-judge` | `panel` | `/arena` phase C, pick one, prefer a different family from the parent |
| `swarm-workers` | `fast` | `/swarm` workers |
| `architect-runners` | `panel` | `/architect` design exploration |
| `interrogate-reviewers` | `panel` | `/interrogate` reviewers |
| `comment-sicko` | `fast` | `/no-comments` |

An unmapped role is `balanced`. A role the user has pinned in their config wins over this table.

## Class resolution per host

Resolve at session start. Never write a slug you have not confirmed exists on this host.

**Claude Code.** Tier aliases (`opus`, `sonnet`, `haiku`, `fable`) at an `Agent` call site; a
predefined agent file may pin a full model ID (`claude-opus-5`) instead.
- `deep` -> `opus`
- `fast` -> `haiku` for bulk reads and trivial edits, `sonnet` for anything that must be right
- `balanced` -> `sonnet`
- `panel` -> no cross-vendor diversity exists here, so this is Tier 2. Within that ceiling you can
  still get real variation by predefining agent files pinned to different model IDs. Cover the
  remainder with stances, and say which you used.

**Codex CLI.** One vendor, but a real per-delegate choice on two axes: the model itself and its
reasoning effort. A spawn names both, overriding `agents.default_subagent_model` and
`agents.default_subagent_reasoning_effort`; session-wide defaults live in `config.toml`.
- `deep` -> your strongest available model at high or xhigh reasoning effort
- `fast` -> a fast model at the configured reasoning budget
- `balanced` -> the configured default model and effort
- `panel` -> distinct models where you have more than one, otherwise one model at differing
  efforts plus the stance set. Single-vendor either way, so report Tier 2, not Tier 3.

**GitHub Copilot.** A custom agent may name its own `model:`, and the picker spans vendors.
- `deep` -> a strong reasoning model from the picker
- `fast` -> a fast, cheap model from the picker
- `balanced` -> the session's model
- `panel` -> genuinely cross-vendor, one agent file per entry. A subagent may not request a model
  in a higher cost tier than its parent, so pick the parent accordingly.

**generic (unknown host).** Every class resolves to `inherit` until you have successfully
addressed a model in this session. Raise a class only after that, and say so.

**Cursor.** Slugs are addressable. Resolution is the user's `/setup-pstack` config, defaulting to
upstream's table. This is the only host where `panel` reaches Tier 3.

## Reasoning budget

The optional `# budget` line in `.pstack/models.md` applies independently of model class:
`unlimited` requests `max`, `large` requests `xhigh`, `medium` requests `high`, and
`small` requests `medium`. Default to `large` on first setup. Only use effort values
confirmed on this host. If the requested effort is unavailable, use the highest
confirmed effort at or below it and report the substitution. If the host cannot set
effort, retain its default and report that limitation. `inherit`, `inherit-parent`
and `auto` leave both the model and effort unset.

## Never do this

- Do not paste a slug from this repo into a running session. Resolve the class against the host.
- Do not fail a step because a configured model is unavailable. Fall back to the class default,
  proceed, and note the substitution once.
- Do not treat `inherit` as an error or a missing value. It is a valid, common, correct answer.
- Do not upgrade a role to `deep` because a task feels important. The table is the decision.
