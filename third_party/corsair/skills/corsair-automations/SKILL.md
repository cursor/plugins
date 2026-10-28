---
name: corsair-automations
description: Use when the user wants something to happen automatically through Corsair, either when an app event occurs ("when a Linear issue is marked Done, post it in Slack") or on a schedule ("every Monday at 9"), or asks whether an automation ran or why it failed, or wants to list, change or switch off an automation. Covers add_triggers, list_triggers, list_runs, get_run and remove_triggers.
---

# Build and check Corsair automations

An automation is a trigger (an app event or a clock) plus the steps that run when it fires. Saving one is half the job. The other half is confirming it fires and works, because an automation can save cleanly and still fail on its first real event.

## Before you add one

- Call `list_triggers`. If something already watches the same event and does the same thing, tell the user instead of adding a second one.
- If there's no `add_triggers` tool, this connection is read-only: automations can't be added or switched off from here (`list_triggers`, `list_runs` and `get_run` still work). Tell the user. Don't recreate the automation with `run_script`.
- Every app the automation uses has to be connected. If one isn't, connect it first (see the corsair-connect-apps skill).

## Path A: describe it in plain English

This is the default. Call `add_triggers` with only `intent`, written the way the user would say it, with the specifics: which app, which event, which channel or person, what the message says.

```json
{ "intent": "When a Linear issue is marked Done, post its title in the #ships Slack channel." }
```

Corsair builds it in the background, so it doesn't exist yet when the call returns.

1. Wait briefly, then call `list_triggers`. Check a couple of times; if it's still building, tell the user and check later instead of polling in a loop. A build in progress shows as "one you described is still being built".
2. If it "needs one question answered", give the user the question and its options. Send their choice back with `{"job": "<job id>", "answer": "<the option exactly as listed>"}` and nothing else in the call.
3. If it "could not be built", tell the user and offer Path B.
4. Once it's live, read its description back and check it matches what the user meant.

## Path B: exact trigger and steps

Use this when you know exactly which event and which calls you need, or Path A built the wrong thing.

1. Find the event: `list_integration_operations {"integration": "linear", "type": "webhooks"}`.
2. Look up each action a step will call, for example `list_integration_operations {"integration": "slack", "operation": "slack.api.messages.post"}`. Corsair refuses to save a step that calls an action it doesn't recognize, so take names and arguments from here, not from memory.
3. Call `add_triggers` with `trigger` and `action`:

```json
{
  "name": "Linear done to #ships",
  "trigger": {
    "integration": "linear",
    "event": "Issue.update",
    "equals": { "data.state.name": "Done" }
  },
  "action": [
    {
      "name": "notify",
      "code": "await corsair.slack.api.messages.post({ channel: 'C0123ABCD', text: payload.data.title });"
    }
  ]
}
```

- `equals` paths start with `data.`, which holds what the app sent. With nothing narrowing it, a trigger fires on every event of that kind and runs a lot. The result says so when that's the case; pass the warning on.
- Use real ids in steps. Look up a channel id or user id with `read_data` first.
- For a schedule, leave out `integration` and `event` and set `"every": "30m"` (the first run is one interval from now) or `"cron": "0 9 * * 1"` (UTC, 5 fields). Convert the user's local time to UTC and tell them the time you used.
- A step's `code` is a JS body with `corsair` and `payload` (the triggering event) in scope. Other step `verb`s: `sleep` (`ms`), `sleepUntil` (`when`), `waitFor` (`event`, `match`, `timeout`), and `ai`, `bool` or `score` (`prompt`, `input`) to ask a model.
- Automations are matched by `name`. Sending an existing name replaces that automation's steps. Without a `name`, changed steps create a second automation, so to fix or change one, pass its exact name from `list_triggers`. For a new one, use a new name.
- The example fires on every update to an issue that is Done, including edits after it was marked Done. Mention that when it could post twice.

## Check that it works

1. Ask the user to make the event happen, or tell them what to watch for. For a schedule, tell the user when the first run is due, and check `list_runs` after it.
2. Call `list_runs`. It lists recent runs, newest first, with each run's id and whether it succeeded, failed, is still running, or needs approval (see corsair-approvals).
3. For a failed run, call `get_run {"run": "<id>"}`. The failing step usually says what went wrong, often a value an action didn't accept. Fix it with Path B using the same `name`, and check again.
4. No run at all means the trigger didn't match. Compare the event name and the `equals` values with what `list_integration_operations` shows.

Don't tell the user an automation works until a run has succeeded.

## Stop one

`remove_triggers {"trigger": "<id from list_triggers>"}` switches an automation off. Its steps stay saved in Corsair. If two automations look alike, confirm which one with the user first.
