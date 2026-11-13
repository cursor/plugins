---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Every spawn is a Task subagent with `subagent_type: generalPurpose` and `readonly: true`. Explorers use the `how explorer` line in the `pstack-models.mdc` rule (default `grok-4.7-xhigh-fast`), and every explainer uses the `how explainer` line (default `claude-opus-5-5-xhigh`). Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug as invalid, use the default and say so. If it rejects the default as invalid, use the closest valid slug of the same family from its error message. A weekly-usage or capacity refusal is not an invalid-slug error. Switch model family once, then have the parent finish from commits already pushed. Do not fall back inside the capped family. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

## 1. Assess complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. Spawn one explainer that explores and explains in one pass, built from `references/explainer-prompt.md` without the explorer-findings section. Go to step 4.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): go to step 2.

When in doubt, take the simple path.

## 2. Explore (complex only)

Decompose the question into 2 to 4 angles, each a distinct slice of the subsystem. Build each prompt from `references/explorer-prompt.md` with its angle filled in. That template keeps the literal `readonly: true` token. Before each Task spawn, run `python3 support/check-spawn.py --role how-explorer --subagent generalPurpose --readonly --prompt "<that prompt>"`. A non-zero exit is a refusal. Do not spawn. The Task tool's readonly field never reaches that script. Discard the harvest directory for any explorer whose check was skipped or failed. Do not feed that harvest to an explainer or the arena. Spawn the remaining explorers in a single message.

## 3. Synthesize (complex only)

Once all explorers have returned, spawn one explainer with `references/explainer-prompt.md` and every explorer's findings filled in. Skip any harvest that step 2 discarded.

## 4. Present

Present the explainer's output. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it. When the explainer shares the parent's model family (including a same-family stand-in after a usage refusal), treat that output as a draft. It cannot move an open question into the settled-facts list. Keep those questions open until a different-family explainer or a guest probe settles them.

## Output format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
