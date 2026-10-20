---
name: principle-banned-set
description: "Apply to any model slug in the Anthropic/Claude, Google/Gemini, Grok/xAI, or OpenAI/GPT families. Banned in the on-prem stack, no exceptions: never written, offered, selected, defaulted to, or fallen back to, even when one is available."
disable-model-invocation: true
---

# Banned Set

The banned families are absolute. They are not "discouraged" or "a last resort." They are out, with no exceptions.

**Why:** The on-prem stack exists to keep work on self-hosted, open-weight models. A single fallback to a frontier API defeats the point and quietly changes what "on-prem" means. Banning by family, not by slug list, closes the gap new model names would leave.

Banned, by family:

- **Anthropic / Claude** — any slug containing `claude`, `anthropic`, `fable`, `opus`, `sonnet`, `haiku`.
- **Google / Gemini** — any slug containing `gemini`, `google`.
- **Grok / xAI** — any slug containing `grok`, `xai`.
- **OpenAI / GPT** — any slug containing `gpt`, `sol`, `o1`, `o3`.

This holds **even when** a banned slug appears available in the session model list, **even when** a spawn fails or times out, and **even when** no allowlisted model seems to work. The ban is not a preference that availability can override.

A banned slug never appears in the rule file, in a spawn, in a panel, or in an offer list. If nothing allowlisted works, stop and tell the user (**no-fallback-to-banned**). Do not present a banned option as the escape hatch.

Inheritance is the one path by which a frontier model can still run in the stack, and it is not an exception to this ban. `inherit-parent`/`auto` names no frontier slug; it runs whatever the parent chat runs. That alias is governed by **inherit-parent-honestly**. The ban here covers every slug that is written, offered, presented, selected, or defaulted.
