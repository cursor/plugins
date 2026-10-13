---
name: onprem-help
description: Guides users through onprem setup, /onprem-mode, and picking the skill, playbook, or principle for a task. Type /onprem-help with a question.
disable-model-invocation: true
---

# Onprem help

Answer the user's question about the onprem stack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. The user asked how, and an onprem run spends real tokens, so let them send the prompt.

A message that asks for work, such as "use onprem to fix this bug", is not a help question. Read [`onprem-mode`](../onprem-mode/SKILL.md), do the work under it, and mention once that a Custom Mode keeps it on.

This file maps questions to the skills and guide pages that hold the answers. Those files own the details. Read the file you route to before you quote it, and trust it when it disagrees with this map.

## Find out what they need

Infer the need from the message and the conversation. A named situation goes straight to its section. If the need is still unclear, ask one multiple-choice question with these options, then answer only the section they pick:

- What is the on-prem stack
- Get set up
- Start a task with `/onprem-mode`
- Pick a skill or principle for a situation
- Fix a run that went wrong
- Share it with someone

Check the state that changes the answer, and mention it only when it does:

- No `~/.cursor/rules/onprem-models.mdc` means `/setup-onprem` hasn't run for this user, so every role uses its default model.
- No `verify-*` skill or other app harness in the project means agents have no scripted way to drive the app. Mention `/create-verify-skill` when the question is about proving a change works.

## What is the on-prem stack

onprem is a model governance lock plus an operating doctrine, packaged like pstack. The lock is a **closed allowlist** of on-prem models: `inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`. Claude/Anthropic, Gemini/Google, Grok/xAI, and OpenAI/GPT are banned, absolute, no exceptions. The doctrine is the operate principles: verifiable units, context discipline, deterministic proof, honest inheritance, fresh subagents. The 12 named principles live under `skills/principle-*/`. [Guide page 2](../../docs/guide/02-the-lock.md) has the full lock. [Guide page 4](../../docs/guide/04-principles.md) lists the principles.

## Get set up

1. Put the plugin at `~/.cursor/plugins/local/onprem/` (or `/add-plugin onprem` once it is hosted).
2. Run [`/setup-onprem`](../setup-onprem/SKILL.md). It detects the on-prem models you have, strips the banned set, confirms the unlimited (max) budget, maps a model to each role, validates every slug, and writes `~/.cursor/rules/onprem-models.mdc`. The rule applies to new chats.
3. Start a real task with `/onprem-mode`, a goal, and a check that can pass or fail.

Installing changes nothing until the user invokes a skill. Only `/setup-onprem` writes the rule. The [README](../../README.md) and [guide page 1](../../docs/guide/01-setup.md) have the details.

## Start a task with `/onprem-mode`

`/onprem-mode` applies the lock and the named principles, and routes to its playbooks (Audit, Spawn retry, Panel) when a model decision, a failed spawn, or a multi-model review is the task. A good prompt states the goal and how to tell it's done.

Whether `/onprem-mode` stays on depends on how the user starts it:

- Enter on `/onprem-mode` attaches the skill to one message. It fades as the chat moves on.
- Option+Enter on Mac or Alt+Enter on Windows, or Use as Mode from the skill entry, makes it a Custom Mode. It stays in context every turn until the user exits the mode.
- Cursor's docs list Custom Modes in the Agents Window and the CLI. Elsewhere, start each new task with `/onprem-mode`.

To get the same style from a subagent of your own, spawn it with `subagent_type: "onprem-agent"`. That is the exact registered slug, the bare `name` from `agents/onprem-agent.md`, with no plugin prefix. It reads the mode in full before work.

## Pick a skill or principle

| The user wants to | Skill |
|---|---|
| Do non-trivial work under the on-prem lock | [`/onprem-mode`](../onprem-mode/SKILL.md) |
| Pick models per role and a budget; write the rule | [`/setup-onprem`](../setup-onprem/SKILL.md) |
| Validate the rule file against the lock | [`/onprem-mode`](../onprem-mode/SKILL.md), the **audit** playbook |
| Decide the retry model after a failed spawn | [`/onprem-mode`](../onprem-mode/SKILL.md), the **spawn-retry** playbook |
| Run a cross-model review on on-prem judges | [`/onprem-mode`](../onprem-mode/SKILL.md), the **panel** playbook |
| Run a deep managed-fleet review of a diff or tree | [`/onprem-mode`](../onprem-mode/SKILL.md), the **robodev** playbook |
| Give agents a scripted way to drive the app and prove behavior | [`/create-verify-skill`](../create-verify-skill/SKILL.md) |
| Steer with a principle's name | the `principle-*` leaf, e.g. "apply deterministic proof" |
| Find their way around onprem | `/onprem-help` |

Principles are one-rule skills that `/onprem-mode` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply no fallback to banned. tell me what you retried on." Typing `/principle-<name>` still loads one on demand. [Guide page 4](../../docs/guide/04-principles.md) lists all twelve.

Close calls:

- `/setup-onprem` writes the configuration. The **audit** playbook reads it back and checks it. One is the write path, the other is the check path.
- The **spawn-retry** playbook is the on-prem answer to a failed subagent. It is not a general error playbook; if the failure is not a model choice, debug it normally.
- onprem's panel is for on-prem judges. If the user wants pstack's full multi-model review workflow with frontier models, that is pstack's `/interrogate`, not this stack's **panel**.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The mode stopped applying after a few turns | It was started with Enter. Start it as a Custom Mode, or start each task with `/onprem-mode`. |
| A spawn used a frontier model | Check the parent chat model and the role lines. An `inherit-parent` role inherits the parent, it does not grant on-prem status. Pin the role to a real allowlisted slug. |
| A rule change had no effect | The rule applies to new sessions. Start one. |
| A banned slug is in the rule | Run `/setup-onprem`; it rewrites the file idempotently and validates every slug. |
| An on-prem spawn keeps failing | The **spawn-retry** playbook caps retries and then stops with a report. It never degrades to a banned model. |
| The reply claims success from a self-report | Ask for the real check. That's the deterministic-proof principle. |
| A long task drifted on an on-prem model | Re-plan it as **verifiable-units**: smaller steps, each ending in a check. |

## Share it with someone

The stack is two things a recipient needs: the plugin directory and a run of `/setup-onprem` on their machine (their model entitlements may differ, so the rule is generated, not copied). Full instructions in [guide page 5](../../docs/guide/05-sharing.md), including the coexistence note for people who also run pstack.

## Reply

Lead with the answer. Give at most one example prompt in a code block, then the link to the file the answer came from. Keep it short unless the user asked for the whole map.
