---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript before fanning out. Detect the harness and obtain the active workspace directory and session ID from the current runtime. Match both before reading message bodies or exporting a session. Inspect only session metadata while locating candidates in a global store. Never read private chats from unrelated projects.

Use only the locator and parser for the active harness.

- Cursor uses the active workspace's `agent-transcripts/` directory named in the system prompt. Do not glob across `~/.cursor/projects/*/`. The command below applies only to Cursor.

```bash
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

- Cursor has legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. Verify the session identity before checking the opening user prompt in `message.content` text blocks. The first JSONL line need not be a user message.
- OpenCode stores sessions in `~/.local/share/opencode/opencode.db`. Open it read-only with `?mode=ro` and inspect the installed schema. Select session metadata by the active workspace directory and session ID before querying its messages. Export only that session with `opencode export <sessionID>`. Parse the export's `info` and `messages`, with roles in message `info` and text in `parts`. Do not apply Cursor's JSONL parser. Do not use `immutable=1` on the live database, because it can omit recent writes in the write-ahead log.
- Codex stores rollout JSONL under its configured Codex home, normally `~/.codex/sessions/`. Match the `session_meta` payload's `cwd` and `id` before reading messages. Use parent and source metadata to distinguish a child or fork from the active session. Parse user text from `response_item` message payloads or `event_msg` user-message payloads, rather than Cursor's `message.content[0].text`.

Normalize timestamps to one zone when comparing candidates. Do not select a transcript by filename, recency, or prompt text alone. If the runtime does not expose enough metadata to verify one session, write a tight digest of the current conversation and pass that instead. Do not broaden the search.

### 2. Spawn three reviewers in parallel

One message, three `Task` calls, `subagent_type: generalPurpose`, with `model` set as below, agent mode (`readonly: false`). Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Readonly strips MCPs.

Each reviewer and the synthesizer name a role line in the `pstack-models.mdc` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-max` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `gpt-5.6-sol-max` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-max` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `Task` response body.

### 3. Synthesize

One `Task` call, `subagent_type: generalPurpose`, with `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-max`), agent mode (`readonly: false`). The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Readonly strips MCPs. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to Cursor's built-in `create-skill` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `create-skill` and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to `create-skill`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
