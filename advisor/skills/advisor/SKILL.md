---
name: advisor
description: >-
  Advisor mode. Consult a stronger (or different) model at key checkpoints:
  before major decisions, when stuck on an error, and before declaring a task
  done. Use when the user types /advisor, asks to turn the advisor on or off,
  picks an advisor model, or explicitly asks for a second opinion from a
  stronger or different model. Never enable it on your own.
icon: lightbulb
color: purple
---

# Advisor

You are the main model. Advisor mode adds a second, stronger model that you consult at a few key points. The advisor gets your briefing (and the full transcript when available), thinks hard, and returns a verdict with guidance. It does not edit files. You still do the work and make the final call.

State lives in `.cursor/advisor/state.json` at the project root. When that file exists with `"enabled": true`, advisor mode is on for this project.

## Commands

The text after `/advisor` selects the action.

| Input | Action |
| --- | --- |
| `/advisor` | Enable for this conversation with the default advisor: the latest Grok at its highest reasoning effort. If a state file already exists, from this or another conversation, re-bind it here, keeping its `model` and `nudge` settings. |
| `/advisor <model>` | Same, with the given model. Any model available to subagents works: `/advisor cursor-grok-4.6-xhigh-fast`, `/advisor composer-2.5`. |
| `/advisor off` | Disable: delete `.cursor/advisor/`. |
| `/advisor status` | Report model, consult count, and whether the end-of-turn nudge is on. Changes nothing. |
| `/advisor ask <question>` | Consult now about the current work, regardless of checkpoint. |
| `/advisor nudge on` / `off` | Toggle the end-of-turn reminder posted by the plugin's stop hook (default on). |

If the message also contains a task (`/advisor, then refactor the cache layer`), enable first, then do the task under advisor mode.

### Choosing the model

The default is the latest Grok model at its highest reasoning effort, currently `cursor-grok-4.6-xhigh`. If a newer Grok or a higher effort tier appears in the subagent model list available to you, prefer it and say so.

For `/advisor <model>`, resolve the request against the subagent model slugs available to you:

- An exact slug: use it as is.
- A family or version name (`grok fast`, `composer`): that family's latest model at its highest reasoning tier.
- No match: say so, name two or three close options, and keep the current model.

If the Task tool rejects a slug, read the valid slugs from its error message, pick the closest one (same family, highest reasoning tier), save it to `state.json`, and tell the user in one line. Do not block the consult on the slug.

## Enabling

1. Resolve the model as described above.
2. Write `.cursor/advisor/state.json` with the file-writing tool (not a shell redirect), creating the directory if needed. If a state file already exists, carry over its `model` (unless this command names one) and `nudge`, and reset every other field to the values below. You cannot see which conversation an existing file belongs to, so always rewrite it: that re-binds the mode to this conversation, the hooks re-fill `conversation_id` and `transcript_path`, and the next consult starts a fresh advisor instead of resuming another chat's. Also delete `.cursor/advisor/pending` and `.cursor/advisor/last-response.txt` if they exist, so a marker left by another conversation cannot trigger the end-of-turn nudge here. Keep `log.md`.

   ```json
   {
     "enabled": true,
     "model": "cursor-grok-4.6-xhigh",
     "nudge": true,
     "advisor_agent_id": null,
     "conversation_id": null,
     "transcript_path": null,
     "consults": 0,
     "last_consult_at": null,
     "enabled_at": "<current UTC time, ISO 8601>"
   }
   ```

   The plugin's hooks fill in `conversation_id`, `transcript_path`, `consults`, and `last_consult_at`. Leave them alone.
3. Confirm in one line: `Advisor on: <slug>. I'll consult it before major decisions, when I'm stuck, and before I call the task done.` Then continue with any task in the same message.

Never stage or commit `.cursor/advisor/`.

## Checkpoints

Consult at these points and nowhere else. Each consult is a strong-model call; the value comes from using it selectively.

1. **Before a major decision.** Choosing between architectures or approaches; changes that are hard to reverse or have a wide blast radius (schema or data migrations, deleting or rewriting a module, public API or config format changes, dependency swaps, auth, payments, or other security-sensitive code); or a request that is ambiguous in a way that would change the work materially. Consult once you have a concrete plan and the options in hand, not before you understand the problem. One consult covers the plan; do not re-consult per file.
2. **When stuck.** The same error or failing test after two genuine fix attempts; behavior you cannot explain from the code; or when you are about to reach for a workaround: a retry loop, a `sleep`, a broad `try/except`, skipping a test, or disabling a check to get past something.
3. **Before declaring done.** Any task that changed logic or touched more than a couple of files: consult once before writing the final summary, and include what you verified and how. Skip for trivial edits (typos, comments, a one-line config change) and say so in one line.
4. **On request.** `/advisor ask ...`, or the user asks what the advisor thinks.

Do not consult for routine steps, for things you can verify yourself (run the test, read the code), or more than once per checkpoint. If you would consult more than about four times in one task, the task should probably be split, or you should ask the user.

## How to consult

1. Read `.cursor/advisor/state.json` and decide which situation you are in:
   - **Mode on here**: the file exists with `enabled: true` and you ran the Enabling steps in this conversation. Checkpoint consults and `/advisor ask` both follow the steps below in full, including `resume` and state writes.
   - **Not on here**: the file is missing, `enabled` is false, or you did not write it. A file you did not write belongs to another chat; only `/advisor` re-binds it, so leave it alone and never `resume` an `advisor_agent_id` you did not save yourself. Do not consult at checkpoints. If the user explicitly asks for a consult in this message (`/advisor ask ...`, or a request for a second opinion), run it as a one-off: a fresh spawn on the file's `model` if there is one, otherwise the default; no `resume`, no state writes, and no `transcript_path` (another chat's transcript is not yours to share; write "not available"). Mention that `/advisor` turns the mode on for this conversation.
2. Build the briefing from `references/briefing-template.md`. Give the advisor everything it needs to disagree with you:
   - The user's request verbatim, plus constraints or corrections they added later.
   - What has happened so far, in order: what you investigated, decided, changed, tried, and ruled out.
   - Relevant tool results verbatim: error messages, stack traces, test output, diffs. Trim unrelated noise and mark trims with `[...]`, but never paraphrase evidence.
   - Current state: `git status --short`, `git diff --stat`, files you touched, anything half-done.
   - Your specific questions, the options you see, and your current leaning with reasons.
   - The `transcript_path` from `state.json` when set and the mode is on in this conversation, so the advisor can read the full conversation itself.
   - No secrets. Redact tokens, keys, and `.env` values.
3. Spawn the advisor in the foreground and wait for it:
   - `subagent_type: "advisor-subagent"`
   - `model: <state.model>`
   - `description: "Advisor: <checkpoint>"`, for example `Advisor: pre-completion review`
   - `run_in_background: false`
   - When `state.advisor_agent_id` is set, pass it as `resume` and omit `model`; the advisor keeps its model and the context of earlier consults, so the briefing can be a delta: what changed since last time plus the new questions. If the resume fails, spawn fresh.
   - Save the returned agent id to `advisor_agent_id` in `state.json`. Clear it when the model changes.
4. Act on the verdict:
   - `proceed`: go.
   - `proceed with changes`: make the recommended changes unless they conflict with the user's instructions or facts you have verified. Say which you skipped and why.
   - `stop`: do not continue with the plan. Rethink, or bring the disagreement to the user if it is a product or scope question.
   - If the advisor asks for something it needs, provide it via `resume`, once. Do not ping-pong.
   - You are accountable for the result. The advisor is a strong second opinion, not an authority. If it is wrong about the codebase, show it the evidence once, or overrule it and tell the user why.
5. Report each consult to the user in one or two lines: `Advisor (<model>): <verdict>. <One-line summary>. <What you did about it.>` Keep the advisor's full response out of the chat unless the user asks; the hooks also append it to `.cursor/advisor/log.md`.

## End-of-turn nudge

When files changed since the last consult and a turn ends without one, the plugin's `stop` hook posts a follow-up that starts with `[Advisor]`. Treat it as the "before declaring done" checkpoint: run the pre-completion consult, or answer in one line that the change was trivial, or that you are waiting on the user, and stop. It fires at most once per batch of edits. `/advisor nudge off` disables it.

## Disabling

`/advisor off`: delete `.cursor/advisor/` and confirm in one line. Do not consult again in this conversation unless the user re-enables the mode or explicitly asks for a one-off consult.

## Guardrails

- Never enable advisor mode unasked. "Get a second opinion on this" is a one-off consult, not a mode change.
- The advisor is read-only. Never ask it to edit files or do the task.
- Never loop on the advisor: at most one follow-up per checkpoint.
- If the `advisor-subagent` subagent is unavailable (no Task tool, or a hook denies it), tell the user once and continue without it.
- To keep this skill in context for a whole session rather than one message, the user can invoke `/advisor` as a Custom Mode (Option+Enter / Alt+Enter). The state file works either way.
