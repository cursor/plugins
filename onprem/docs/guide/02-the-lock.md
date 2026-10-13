# The lock

The on-prem lock is a closed set plus an absolute ban plus a failure policy. Each part exists because the others alone are not enough.

## The closed allowlist

The only legal model values, in full:

- `inherit-parent` or `auto` — the subagent runs on the parent chat model (omit the Task `model`).
- `Qwen/Qwen3.8-27B-FP8`
- `Qwen/Qwen3.8-Flash-Next-FP8`
- `moonshotai/Kimi-K3`
- `zai-org/GLM-5.3`

Anything else is an **invalid value**, not a weaker alternative. A closed set turns "is this allowed?" into a yes/no lookup, which is the only form a lock can take. An open list ("these, and whatever else is available") has no edge, and every new model release is an argument.

Adding a model is an explicit, user-approved edit to the rule file. It never happens at runtime.

## The banned set

Banned by family, absolute, no exceptions:

- **Anthropic / Claude** — `claude`, `anthropic`, `fable`, `opus`, `sonnet`, `haiku`
- **Google / Gemini** — `gemini`, `google`
- **Grok / xAI** — `grok`, `xai`
- **OpenAI / GPT** — `gpt`, `sol`

Banning by family (substring) rather than by slug list closes the gap that new model names would open. And the ban holds in the three places it is most likely to be tested:

- when a banned slug **is available** in the session,
- when a spawn **fails or times out** and the pressure is to "just try the other one",
- when **no allowlisted model seems to work** and a banned one looks like the escape hatch.

There is no escape hatch. If nothing allowlisted works, the run stops and tells you.

## The failure policy

A failed spawn is retried on a **different allowlisted** model for the same role, capped at two retries, or stopped and reported. The onprem-mode **spawn-retry** playbook is this policy as a checklist. A task finished on a banned model after on-prem failures is not a success with a footnote; it is a lock violation, and it is reported as one.

## The panel rule

Multi-model panels use the two on-prem families: `Qwen/Qwen3.8-27B-FP8` and `zai-org/GLM-5.3`. No third family joins. The cross-judge seat takes a family different from the parent chat's model when possible, staying on Qwen or GLM. This is **panel-composition**: diversity without reintroducing what the lock removes.

## The budget

`unlimited (max)`. On a self-hosted stack the marginal token is not a per-request bill, so the usual reason to cap reasoning depth does not apply. The standard for a spawn is the strongest on-prem fit for the role, not the cheapest model that might work. **unlimited-budget**.

## Where the lock is enforced

| Surface | Enforcement |
|---|---|
| `/setup-onprem` | validation gate before the rule is written |
| `~/.cursor/rules/onprem-models.mdc` | always-applied; names the allowlist and the ban |
| `onprem-mode` | non-negotiables section; subagent defaults are locked |
| spawn failure | the spawn-retry playbook |
| rule drift | the audit playbook |

Next: [Onprem mode](./03-onprem-mode.md).
