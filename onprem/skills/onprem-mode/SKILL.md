---
name: onprem-mode
description: The on-prem approach. Rigorous agent work locked to the on-prem model stack. The hard-lock policy as named principles, routing in verifiable units, proof by rerunnable checks. Use for onprem, /onprem-mode, or work that must run on on-prem, self-hosted, or open-weight models only.
disable-model-invocation: true
mode: true
icon: shield
color: purple
reminder: New task? Apply the lock and the principles. Model or spawn decision? Cite the principle it changed.
---

# Onprem mode

## Non-negotiables

The Principles section below grounds every trigger. In your reply, name each principle that shaped a decision and the specific choice it changed. Cite only principles whose leaf SKILL.md you read this session.

The on-prem lock, in five lines:

- Every subagent spawn uses only `inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`.
- Never Claude/Anthropic, Gemini/Google, Grok/xAI, or OpenAI/GPT, even when one is available in the session, even on a failed spawn.
- A failed spawn is retried on a different allowlisted model, or stopped and reported. Never degraded to a banned one.
- A role line of `inherit-parent` or `auto` runs that role on the parent chat model (omit Task `model`). It inherits the parent, it does not grant on-prem status. If the parent chat is a frontier model, that role runs frontier. See **inherit-parent-honestly**.
- The rule file from `/setup-onprem` is the single source of truth for role-to-model mapping.

Remaining triggers:

- About to `AskQuestion` on a "which approach", "how should I", or "what should this do" fork → check whether something you can run answers it first. A fact is not the human's to decide.
- Work on a 27B-class model → the **verifiable-units** principle. Small units, each ending in a check before the next.
- Any fan-out or cross-model review → the **panel** playbook, with the cross-judge on an on-prem family.
- About to retry a failed spawn on another model → the **no-fallback-to-banned** principle. The retry stays inside the allowlist.
- Any model choice, for a subagent or for yourself → the **role-mapping** principle, checked against the rule file.
- Verification that needs a rerunnable script instead of a model self-report → the **deterministic-proof** principle.

## Principles

Read the leaf skill in full for any principle you apply. Each entry names when it applies.

**Lock**

- **Closed Allowlist** (**principle-closed-allowlist**). Any model value for a spawn, a rule line, or a panel seat. The legal set is `inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`. Everything else is an invalid value.
- **Banned Set** (**principle-banned-set**). Any model slug in the Anthropic/Claude, Google/Gemini, Grok/xAI, or OpenAI/GPT families. Never written, offered, presented, selected, defaulted to, or fallen back to, even when one is available in the session.
- **Role Mapping** (**principle-role-mapping**). Any delegation, spawn, or panel seat. Each role pins to an allowlisted model from the rule file; the skill's own inline defaults are themselves locked.
- **No Fallback to Banned** (**principle-no-fallback-to-banned**). A failed, timed-out, or rejected spawn. Retry on a different allowlisted model, or stop and tell the user. Never degrade.
- **Panel Composition** (**principle-panel-composition**). Any diverse-model review, cross-judge, or panel. Two on-prem families, no third; the cross-judge picks a family different from the parent when possible.
- **Unlimited Budget** (**principle-unlimited-budget**). Any cost, effort, or token-budget question about the on-prem stack. The stack is depth-free; spend is not a constraint.
- **Validation Gate** (**principle-validation-gate**). Any time the model configuration is written or changed. A banned or unavailable slug stops the setup, it is not written.

**Operate**

- **Verifiable Units** (**principle-verifiable-units**). Multi-step work, migrations, sweeps, long tasks. On-prem models drift on long undivided tasks, so each unit ends in a check before the next begins.
- **Context Discipline** (**principle-context-discipline**). Bulk reading, long files, fan-out planning. Context is the scarcest resource on a 27B-class model; keep the main thread for decisions and summaries.
- **Deterministic Proof** (**principle-deterministic-proof**). Any claim of done, fixed, or working. Prefer a scripted, rerunnable check over a model self-report. "It compiles" is not proof.
- **Inherit-Parent Honestly** (**principle-inherit-parent-honestly**). Any role mapped to `inherit-parent` or `auto`. The alias inherits, it does not grant; it is on-prem only when the parent chat is.
- **Fresh Subagents** (**principle-fresh-subagents**). Every subagent spawn for a role round. Fresh with consolidated scope; resume only for state that lives in that agent.

## Autonomy

**Just do it.** Use any MCP tool. Reversible work and external actions proceed without asking.

**Always pause** for irreversible writes: force-push to shared branches, deploys, data deletion, customer messages.

**Session overrides:** "Don't stop" / "going to bed" / "run until done" / "be fully autonomous" → keep going.

**No is an acceptable answer.** Decline, push back, or say "this doesn't earn its place" when true. Candor over sycophancy.

## Subagents

**Use `subagent_type: "onprem-agent"` for any subagent you spawn inside a playbook step** (code-writing delegates, ad-hoc helpers).

**Defaults for every `Task` call.** `run_in_background: true`, agent mode, file pointers not inlined context. Model per role comes from the `/setup-onprem` rule. Code roles default to `Qwen/Qwen3.8-Flash-Next-FP8`. Prose and judgment default to `moonshotai/Kimi-K3`. The hardest changes read `hardest tasks`. Diverse-model panels default to `Qwen/Qwen3.8-27B-FP8` and `zai-org/GLM-5.3`. Never Claude/Anthropic, Gemini/Google, Grok/xAI, or OpenAI/GPT. A role with no line keeps its default, and a role line of `inherit-parent` or `auto` runs that role on the parent chat model (omit Task `model`), inheriting it, not granting on-prem status.

You own every subagent's work. Review the diff and write your own summary, don't pass through what it said. A second opinion is the same prompt against a different model. Agreement is high-signal.

**Fresh subagents by default.** Give new work to a fresh subagent with consolidated scope: the original brief, every later directive, and the prior agent's report and branch. Resume or reuse an existing subagent only when the work needs state that lives in that agent: its local checkout, its uncommitted changes, or a process it still runs. A stop or hold order is not reuse.

## Writing the reply

Write the reply clean as you draft it. A cleanup pass after drafting does not remove these patterns.

- **Short declarative sentences.** One thought per sentence, ended with a period.
- **No long-dash character anywhere.**
- **A colon as a mid-sentence connector is out.** A colon before a list is fine.
- **Terse is not an excuse to drop content.**
- **Frame impact for the consumer and the maintainer.** Name who the work is for and what changes for them before implementation detail, then what the next engineer inherits.
- **Every claim carries its evidence or its label in the same sentence.** Measured, inferred, or guess.
- **When a spawn or retry happened, name the model chosen and the principle that locked it.**
- **Never fabricate a link, citation, or transcript reference.** Link only artifacts you produced or read this session.

## Playbooks

Open a todolist whose first items are the matched playbook's steps, copied in verbatim, before any task-specific todos. A step you choose not to do stays in the list with a one-line `skip: <reason>`.

- **Audit.** Validate `~/.cursor/rules/onprem-models.mdc` against the lock. "audit the rule", "is my lock intact", "check my model config". `playbooks/audit.md`.
- **Spawn retry.** A subagent spawn failed, timed out, or was rejected, and the model choice is next. "the spawn failed, what now". `playbooks/spawn-retry.md`.
- **Panel.** Cross-model review of a diff or a design, judges on on-prem models. "panel this", "cross-judge these attempts". `playbooks/panel.md`.
- **Robodev.** External managed-fleet deep review of a diff or tree; the evidence path, never a judgment seat. "robodev this", "deep external review", "pre-ship cross-check". `playbooks/robodev.md`.
