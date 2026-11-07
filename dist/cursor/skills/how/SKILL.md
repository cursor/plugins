---
name: how
description: "Use for how does X work, code walkthroughs, placement, ownership, and layering questions. Explains architecture and runtime flow; use why for motivation."
---

# How

Read [the cursor adapter](../../docs/harness/cursor.md) before this skill.

Read [the core](../../docs/core.md) and the current client adapter.

## Assess complexity

State the question and scope. A single module, symbol, or continuous trace is
handled directly. Read its source, callers, and relevant tests. No subagent is
needed for a trivial explanation.

## Explore

For substantial independent questions, delegate distinct evidence slices using
the exploration role and the restricted reader. Stay within configured limits.
Use [the explorer brief](references/explorer-prompt.md), including exact files,
the question, allowed actions, and the expected report.
Do not grant shell or write-capable MCP access to a read-only worker.

## Synthesize

Explain from verified file/symbol references using
[the explainer brief](references/explainer-prompt.md). Use the explanation role
only if a separate synthesis context is justified. Separate observed behavior
from inference and unknowns. Do not change code while answering a read-only question.

## Output

Use applicable sections: Overview, Key Concepts, How It Works, Where Things
Live, and Gotchas. Include concise source references and any unverified behavior.
