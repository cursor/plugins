# Sharing

onprem is built to hand to someone else. The handoff is short because the stack is self-describing: the lock is in the plugin, and the configuration is generated on their machine.

## The handoff

Send the repo (https://github.com/TeslaJarTran/onprem) or the plugin directory. They do:

1. `mkdir -p ~/.cursor/plugins/local && git clone https://github.com/TeslaJarTran/onprem ~/.cursor/plugins/local/onprem`, or put the directory there.
2. Run `/setup-onprem`.
3. Start a new chat, then start a task with `/onprem-mode`. The rule applies to new sessions only.

If the `/onprem-*` skills do not appear in the `/` menu after cloning, reload the window (Developer: Reload Window). Cursor picks up local plugins at startup.

That's it. The rule file is **generated, not copied**, on purpose:

- Their on-prem entitlements may differ from yours. `/setup-onprem` detects what they actually have and offers only the intersection with the allowlist.
- The validation gate refuses to write a slug they don't have, so a pasted-in rule that points at your `Qwen/Qwen3.8-Flash-Next-FP8` endpoint would not silently break their spawns.
- The gate checks that a slug is allowlisted and listed in their session, not that their endpoint serves it. Their first real `/onprem-mode` task is the live check: run one small task before fanning out.
- The ban is identical for everyone. Nothing in the setup is per-operator except which allowlisted slugs are available and the role values they choose.

## What to send them

A one-paragraph version, ready to paste:

> We run agent work on-prem only. The onprem stack enforces that: a closed allowlist (`inherit-parent`/`auto`, `Qwen/Qwen3.8-27B-FP8`, `Qwen/Qwen3.8-Flash-Next-FP8`, `moonshotai/Kimi-K3`, `zai-org/GLM-5.3`), an absolute ban on Claude/Anthropic, Gemini/Google, Grok/xAI, and OpenAI/GPT, and a failure policy that retries on another allowlisted model or stops, never degrades. Install the `onprem` plugin, run `/setup-onprem`, and use `/onprem-mode` for work that must stay on-prem. The twelve named principles are in the README and `docs/guide/04-principles.md`.

## Coexistence with pstack

People who already run pstack can run onprem alongside it. The rules:

- Each stack reads its own rule file: `pstack-models.mdc` for pstack, `onprem-models.mdc` for onprem.
- If they want one source of truth for the allowlist, `/setup-onprem` offers to align pstack's role values with the on-prem allowlist. It does not overwrite or delete the pstack rule.
- The modes are separate. Work that must stay on-prem starts with `/onprem-mode`; work on pstack's model policy starts with `/poteto-mode`.
- The subagents are separate too: `poteto-agent` vs `onprem-agent`.

The practical pattern: pstack's engineering workflow skills (how, why, architect, arena, swarm, interrogate) do the shape of the work, and the on-prem rule files make the model policy the same under both. The onprem principles then apply whenever `/onprem-mode` is in context.

## Auditing after the handoff

The recipient can verify their own install any time:

```
/onprem-mode audit the rule. is my lock intact?
```

The audit playbook checks the allowlist line and every role value against the closed set, and reports violations by line. A clean audit is the answer to "did this land right?"
