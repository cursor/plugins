# Principles

onprem ships twelve principles as individual skills, one rule each. `/onprem-mode` reads their index at the start of every task, applies the ones the task triggers, and names each applied principle in its reply along with the decision it changed.

You don't invoke principles. You use their names to steer. Each name points at a complete rule the agent has already read, so one phrase redirects the work more precisely than a paragraph of instructions.

## Steering in practice

Say a spawn is about to fall back to the frontier model because the on-prem one timed out:

```text
apply no fallback to banned. retry on a different allowlisted model, or stop and tell me.
```

Say the rule file was hand-edited and you want to know the state of your lock:

```text
audit the rule. is my lock intact?
```

Say a long task is drifting on a 27B-class model:

```text
re-plan as verifiable units. every step ends in a check before the next one starts.
```

Say a role line is `inherit-parent` and the parent chat is a frontier model:

```text
that's inherit-parent, confirm it's honest. pin the role to a real on-prem slug.
```

Each phrase lands because the rule behind it is specific. The agent still has to say, in its reply, which decision the rule changed.

## The twelve, briefly

The **lock** principles are the governance doctrine:

- [Closed Allowlist](../../skills/principle-closed-allowlist/SKILL.md) — the legal set is closed; anything else is an invalid value, not a weaker one.
- [Banned Set](../../skills/principle-banned-set/SKILL.md) — Anthropic/Claude, Google/Gemini, Grok/xAI, OpenAI/GPT, banned by family, absolute.
- [Role Mapping](../../skills/principle-role-mapping/SKILL.md) — every role pins to an allowlisted model from the rule file; the inline defaults are locked too.
- [No Fallback to Banned](../../skills/principle-no-fallback-to-banned/SKILL.md) — a failed spawn retries on a different allowlisted model or stops; availability is not license.
- [Panel Composition](../../skills/principle-panel-composition/SKILL.md) — two on-prem families, no third; the cross-judge differs from the parent.
- [Unlimited Budget](../../skills/principle-unlimited-budget/SKILL.md) — depth is not rationed; on-prem spend is not a cost argument.
- [Validation Gate](../../skills/principle-validation-gate/SKILL.md) — the rule is written only after every slug validates; a gate, not a warning.

The **operate** principles are the on-prem way of working:

- [Verifiable Units](../../skills/principle-verifiable-units/SKILL.md) — small units, each ending in a check; long undivided tasks are where on-prem models drift.
- [Context Discipline](../../skills/principle-context-discipline/SKILL.md) — bulk to subagents, summaries not payloads; context is the scarcest resource on a 27B-class model.
- [Deterministic Proof](../../skills/principle-deterministic-proof/SKILL.md) — a rerunnable check beats a self-report; the check must be able to fail.
- [Inherit-Parent Honestly](../../skills/principle-inherit-parent-honestly/SKILL.md) — the alias inherits, it does not grant; pin roles that must stay on-prem.
- [Fresh Subagents](../../skills/principle-fresh-subagents/SKILL.md) — fresh with consolidated scope; resume only for resident state.

Don't memorize the list. Skim it now, then come back when you catch the agent doing something a name here would have prevented. That's how the vocabulary sticks.

Next: [Sharing](./05-sharing.md).
