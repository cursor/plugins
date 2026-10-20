# onprem

this is our on-prem approach, packaged as a stack. the premise is simple: we run agent work on self-hosted, open-weight models, and we want that to be a property of the configuration, not an accident of which model happened to be available.

**onprem is a hard lock plus an operating doctrine.** the lock keeps every subagent spawn on a closed allowlist of on-prem models and out of the frontier API families, absolute, no exceptions. the doctrine is how to work well when you're limited to a 27B-class model: small verifiable units, proof by rerunnable checks, context kept lean, inheritance done honestly.

**it works like pstack.** an entry mode, a stack of named principles you steer by name, a setup skill that writes and validates the rule, and a subagent that runs the approach end to end. if you know pstack, you know onprem. the difference is the subject: pstack is engineering style, onprem is the model governance and the on-prem way of working.

## install

```bash
/add-plugin onprem
```

once it is published in the marketplace. until then, for a local copy:

```bash
mkdir -p ~/.cursor/plugins/local && git clone https://github.com/TeslaJarTran/onprem ~/.cursor/plugins/local/onprem
```

start a new chat after installing, and reload the window (developer: reload window) if the skills do not appear. cursor picks up local plugins at startup.

## get started

two steps:

1. run [`/setup-onprem`](./skills/setup-onprem/SKILL.md). it detects the on-prem models you have, strips the banned set, confirms the unlimited (max) budget, maps a model to each role, validates every slug, and writes `~/.cursor/rules/onprem-models.mdc`.
2. use [`/onprem-mode`](./skills/onprem-mode/SKILL.md) whenever you're doing anything that must stay on-prem.

new here? the [onprem guide](./docs/guide/README.md) walks you through setup, the lock, and the principles. stuck, or unsure which skill fits? ask [`/onprem-help`](./skills/onprem-help/SKILL.md).

## the lock

one paragraph, because it is the whole point:

every subagent spawn uses only `inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`. never claude/anthropic, gemini/google, grok/xai, or openai/gpt, even when one is available, even on a failed spawn. a failed spawn is retried on a different allowlisted model or stopped, never degraded. panels stay on the two on-prem families. the budget is unlimited. [`/setup-onprem`](./skills/setup-onprem/SKILL.md) is the allowlist, and the [audit playbook](./skills/onprem-mode/playbooks/audit.md) checks the rule file against it.

## usage

use [`/onprem-mode`](./skills/onprem-mode/SKILL.md) at the start of a task. it applies the lock and the named principles, and routes to a playbook when the task is a model decision, a failed spawn, a cross-model review, or a deep external review.

### the four playbooks

| playbook | for |
|---|---|
| [audit](./skills/onprem-mode/playbooks/audit.md) | validate `onprem-models.mdc` against the lock. "is my lock intact", "check my model config". |
| [spawn retry](./skills/onprem-mode/playbooks/spawn-retry.md) | a subagent spawn failed or timed out; pick the retry model without crossing the ban. |
| [panel](./skills/onprem-mode/playbooks/panel.md) | cross-model review of a diff or design, judges on on-prem models, cross-judge differs from the parent. |
| [robodev](./skills/onprem-mode/playbooks/robodev.md) | deep external review of a diff or tree on the managed fleet; evidence, never a seat. "robodev this", "pre-ship cross-check". |

to keep [`/onprem-mode`](./skills/onprem-mode/SKILL.md) on across turns, pick it from the `/` menu and press option+enter (mac) or alt+enter (windows) instead of enter. that makes it a custom mode. plain enter attaches it to one message only.

## skills

```
/onprem-mode build the export, but i want to trust it stayed on-prem.
```

```
/setup-onprem
```

<details>
<summary>all skills</summary>

| skill | use it when |
|---|---|
| [`/onprem-mode`](./skills/onprem-mode/SKILL.md) | default entry point for work that must stay on-prem. |
| [`/onprem-help`](./skills/onprem-help/SKILL.md) | you're new to onprem, or unsure which skill, playbook, or principle fits. |
| [`/setup-onprem`](./skills/setup-onprem/SKILL.md) | you want to pick which models onprem uses per role. detects your on-prem models and writes a config rule. |
| [`/create-verify-skill`](./skills/create-verify-skill/SKILL.md) | you want a project-local skill that drives the real app and proves behavior with rerunnable evidence. |
| [`principle-*`](./skills/principle-closed-allowlist/SKILL.md) | the twelve named principles. you steer by name, you rarely invoke one. |

</details>

### examples

```
setup:            /setup-onprem
lock check:       /onprem-mode audit the rule. is my lock intact?
spawn failed:     /onprem-mode the spawn timed out. what model do i retry on?
panel:            /onprem-mode panel this diff. i want two on-prem judges and a cross-judge.
verify:           /create-verify-skill
steer by name:    apply no fallback to banned. tell me what you retried on.
                  apply deterministic proof. show me the check, not the self-report.
```

## the `onprem-agent` subagent

onprem ships a subagent that runs the approach end to end. spawn it from a parent agent via [`subagent_type: "onprem-agent"`](./agents/onprem-agent.md). it reads `onprem-mode` in full, including its inline principles index, before doing any work. substituting `generalPurpose` skips that read and drifts.

[`/onprem-mode`](./skills/onprem-mode/SKILL.md) and [`subagent_type: "onprem-agent"`](./agents/onprem-agent.md) route through the same wrapper.

## principles

twelve short skills, one principle each. `onprem-mode` indexes them inline and reads that index at task start. the standalone files are there so other skills can reference a principle by name, and so the index can point at the full rule for each. steer by name: "apply closed allowlist" or "that's an inherit-parent, confirm it's honest."

<details>
<summary>all twelve principles</summary>

| principle | group | rule |
|---|---|---|
| [closed-allowlist](./skills/principle-closed-allowlist/SKILL.md) | lock | The legal set is closed: `inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`. Everything else is an invalid value. |
| [banned-set](./skills/principle-banned-set/SKILL.md) | lock | Anthropic/Claude, Google/Gemini, Grok/xAI, OpenAI/GPT are banned by family, absolute, no exceptions. |
| [role-mapping](./skills/principle-role-mapping/SKILL.md) | lock | Each role pins to an allowlisted model from the rule file; the skill's inline defaults are themselves locked. |
| [no-fallback-to-banned](./skills/principle-no-fallback-to-banned/SKILL.md) | lock | A failed spawn retries on a different allowlisted model, or stops. Never degrades to a banned one. |
| [panel-composition](./skills/principle-panel-composition/SKILL.md) | lock | Two on-prem families, no third; the cross-judge differs from the parent. |
| [unlimited-budget](./skills/principle-unlimited-budget/SKILL.md) | lock | The stack runs at unlimited (max) depth. On-prem spend is not a cost argument. |
| [validation-gate](./skills/principle-validation-gate/SKILL.md) | lock | The rule is written only after every slug validates. A gate, not a warning. |
| [verifiable-units](./skills/principle-verifiable-units/SKILL.md) | operate | Multi-step work is a sequence of small units, each ending in a check before the next. |
| [context-discipline](./skills/principle-context-discipline/SKILL.md) | operate | Bulk to subagents, summaries not payloads, file pointers not inline context. |
| [deterministic-proof](./skills/principle-deterministic-proof/SKILL.md) | operate | Prove results with a rerunnable check; a model self-report is a claim, not a proof. |
| [inherit-parent-honestly](./skills/principle-inherit-parent-honestly/SKILL.md) | operate | `inherit-parent` inherits the parent, it does not grant on-prem status. |
| [fresh-subagents](./skills/principle-fresh-subagents/SKILL.md) | operate | Fresh subagent with consolidated scope by default; resume only for resident state. |

</details>

## sharing it

onprem is made to hand to someone else. the lock is in two parts: the plugin (the doctrine and the enforcement) and the rule file (the configuration). the rule file is **generated on their machine**, not copied, because their on-prem entitlements may differ and the setup skill validates what it writes. [guide page 5](./docs/guide/05-sharing.md) has the exact handoff and the coexistence note for people who also run pstack.

## not shipped here

- pstack's full workflow skills (`how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `reflect`, and the engineering principles) are pstack's, not onprem's. onprem is the governance and the on-prem way of working. if you want both, install pstack alongside and align the two rule files (see [sharing](./docs/guide/05-sharing.md)).
- onprem has no `maintain-verification-skill` yet. `/create-verify-skill` doubles as the maintenance pass for now.

## license

MIT
