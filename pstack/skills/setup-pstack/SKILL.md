---
name: setup-pstack
description: Configure pstack models and reasoning budgets by active harness, including native subagents and confirmed external review runners. Use for /setup-pstack, model choices, or pstack budgets.
---

# Setup pstack

Write a harness profile to `~/.config/pstack/models.json`. Pstack skills read
the profile matching the current harness using
[`docs/model-routing.md`](../../docs/model-routing.md). Cursor's existing
`~/.cursor/rules/pstack-models.mdc` remains a compatibility export, not the
source of truth for other harnesses.

## 1. Detect the harness and runnable models

Identify the active harness from the tools **available in this session**, not
from installed binaries: Cursor or Claude Code `Task`, Codex `spawn_agent`,
OpenCode agents, or another documented subagent tool. Read its tool schema for
accepted model IDs and effort inputs. If the harness is unclear, ask.

Inventory models by **runner**, then **family** (Claude, GPT, Grok, open-source,
or another family). Prefer a native subagent when it supports the model. Check
external runners independently:

- Cursor Agent: `cursor-agent models` when authenticated. Its list describes
  Cursor access; it is not the only model source.
- Claude Code: check `claude auth status` and its current model configuration.
  Confirm a selected alias through the active Task tool, a user confirmation,
  or an explicitly authorized small probe; authentication alone is not proof
  that every Claude alias is runnable.
- Codex: use this session's subagent tool model schema when in Codex. Else
  check CLI authentication and confirm a selected CLI model before writing it.
  Codex's `model` and reasoning effort are separate inputs.
- OpenCode: check `opencode auth list` and `opencode models`. The catalog is
  broader than configured provider access; confirm the selected provider and
  model with a user confirmation or an authorized probe.
- Local open-source: check loaded models through Ollama, LM Studio, or the
  configured local provider when available. A binary or downloaded catalog is
  not proof that a model is loaded and runnable.

Classify each candidate as **confirmed native**, **confirmed external**, or
**catalog-only/unverified**. Only confirmed models may be written. The native
aliases `inherit-parent` and `auto` are always valid. Never expose credentials
while discovering models, and do not send a model prompt just to list models.

## 2. Load current choices

Read the matching harness profile in `~/.config/pstack/models.json`, if any.
Preserve profiles for other harnesses. If this profile does not exist, read the
legacy Cursor rule when present and treat its role values as candidates, not
proof that those models work in this harness. Drop retired roles such as
`how critics` and report them.

## 3. Choose a budget

Ask the user to select one of these exact labels, naming the current budget
when one exists:

- `unlimited — keep max`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

Budget targets apply to each runner's actual effort control, not by blindly
appending a suffix to a model name. For a native tool with a separate effort
field, keep the model ID and set that field. For effort-encoded variants, choose
the highest confirmed variant at or below the target. For a CLI with a variant
or effort option, use only confirmed options. If a runner has no effort
control, mark its entry unbudgeted in the preview and ask whether to keep it.
`inherit-parent` and `auto` keep the parent model and effort.

## 4. Build a harness-aware proposal

Primary coding roles favor the **active harness's native model family** unless
the user chose otherwise. On Codex, prefer confirmed GPT models for primary
work; on Claude Code, confirmed Claude models; on Cursor or OpenCode, the
confirmed family selected for that session. Use a confirmed different family
for review and adversarial roles when it is runnable. If the native subagent
tool exposes all desired families, use it. Otherwise use a confirmed external
read-only runner for review, as described in `docs/model-routing.md`. Never
present a catalog-only model as an available reviewer.

Use these exact role labels. Single-model roles get one entry; panel roles get
one entry per reviewer. The `arena cross-judge pool` lists candidates from
which Arena selects **one** different-family judge when possible.

| Role group | Labels |
| --- | --- |
| Coding | `feature, refactoring`; `bug-fix`; `perf-issue`; `hillclimb`; `swarm workers` |
| Judgment | `judgment and prose`; `hardest tasks`; `how explainer`; `why synthesizer`; `reflect judgment, divergent, synthesizer` |
| Investigation | `how explorer`; `why investigators`; `reflect tooling` |
| Panels | `arena runners`; `arena cross-judge pool`; `architect runners`; `interrogate reviewers` |

Write-capable roles use native subagents by default. External writers require
explicit user selection and an isolated checkout. Respect an existing
confirmed custom family, list length, or alias on a re-run. Do not replace it
merely because another family's default changed.

## 5. Show, confirm, and validate

Show **every role** with runner, model, effort, family, and detection evidence.
Show panel entries individually so the fan-out count is clear. Mark every
unverified entry as needing a choice, list retired lines dropped, and ask the
user to accept or change specific roles. Offer confirmed native and external
models plus `inherit-parent` and `auto`. Prefer structured questions over an
open-ended prompt.

Before writing, validate that every real model is confirmed for its runner,
every external reviewer has a read-only invocation path, every effort value is
supported, and the user's budget and role choices are recorded. If anything
fails, keep the existing configuration and ask for the missing choice.

## 6. Write the profile

Write or update **only this harness** in `~/.config/pstack/models.json` using
the schema in `docs/model-routing.md`; preserve other profiles. Validate the
result with a JSON parser and read it back. If the active harness is Cursor,
also write `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true`, a
`# budget` line, and the same role labels. Put confirmed native Task model
slugs there; represent external-only entries with the safe native fallback and
note that the portable profile supplies the external runner. Never write an
unverified slug to either file.

Tell the user which profile was written, the selected budget, runner families,
and what will happen if a reviewer is unavailable. The profile applies to new
sessions; re-running `/setup-pstack` updates it.

## 7. Optional verification skill

If the project has no existing way to drive the real app for proof (such as a
`verify-*` skill or browser harness), offer once to create a project-local
verification skill with `/create-verification-skill`. If one already exists,
skip the offer.
