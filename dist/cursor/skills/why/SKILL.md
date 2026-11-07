---
name: why
description: "Use for why was X built this way, design rationale, regressions, postmortems, and evidence-backed thresholds. Investigates available source history and optional records without inventing intent."
---

# Why

Read [the cursor adapter](../../docs/harness/cursor.md) before this skill.

Read [the core](../../docs/core.md), the current client adapter, and
[the epistemics framework](references/epistemics.md).

## Anchor the question

Identify the target, current behavior, source locations, and relevant history.
Use project-provided git/forge access where available. Follow renames and read
substantive commit/PR rationale rather than assuming the newest commit is authoritative.
A small question with complete evidence is answered directly.

## Investigate available evidence

Map available, authorized sources to history, issues, documents, team discussion,
observability, errors, and analytics. No MCP or forge CLI is universally required.
Consult only categories relevant to the question. Record unavailable sources as
gaps without claiming they were searched.

For substantial independent evidence slices, use the exploration role, bounded
workers, and [investigator brief](references/investigator-prompt.md). Adapt
the bundled [source playbooks](references/sources/) to actual read-only tools.
Do not enable general-purpose write access just to reach an MCP. When a restricted
worker cannot access a source, investigate directly under the parent's permissions
and disclose the limitation.

## Synthesize

Use [the synthesis brief](references/synthesizer-prompt.md). The explanation
role applies if a separate synthesizer is justified. Preserve confidence language,
competing hypotheses, null findings, and gaps. History-derived constraints become
Preserve / Change / Avoid / Risk when the answer precedes a change.

## Output

Return The Question, The Code in Question, What We Found, What We Can Reasonably
Infer, Competing Hypotheses, What We Don't Know, Sources Consulted, and Confidence
Summary as applicable. Cite only inspected evidence.
