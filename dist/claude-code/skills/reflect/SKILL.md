---
name: reflect
description: "Use for /reflect or capturing durable lessons from this session. Review an explicit active-session transcript or digest and propose approved skill edits."
disable-model-invocation: true
---

# Reflect

Read [the claude-code adapter](../../docs/harness/claude-code.md) before this skill.

Read [the core](../../docs/core.md) and the current client adapter.
Skip trivial sessions and lessons already encoded correctly.

## Locate evidence

Use a digest of this conversation by default. Transcript mining is opt-in and
requires an explicitly supplied active-session path from the user/host.
Do not infer cache layouts or search unrelated projects.

## Review and synthesize

Use the bundled judgment, tooling, and divergent [briefs](references/), adapting
them to available read-only evidence. Handle a small session directly. For
substantial independent review use bounded workers: exploration for tooling,
architecture for judgment, explanation for synthesis. Templates are output aids,
not permission to add write-capable MCP tools or exceed limits.

Spot-check citations. Return Accepted / Rejected / Backlog using
[the synthesizer brief](references/synthesizer.md). Move lessons better enforced
by code, types, tests, or lint into Backlog.

## Apply only with approval

Show the proposed destination and wait for explicit approval of each edit.
Never edit installed plugin caches. Copy an approved skill into the active
client's supported workspace/user skill directory, then edit and validate it.
Use available authoring tooling; do not assume Cursor's create-skill exists.
Creating backlog tickets is an external write and requires separate authorization.

## Output

Report approved edits, proposed/new skills, backlog proposals, rejected findings,
verification, and any unavailable evidence.
