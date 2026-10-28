---
name: corsair-data
description: Use when answering a question from the user's connected apps through Corsair (find a message, summarize recent emails, check a calendar, look up an issue) or doing something in an app right now (send, create, update). Explains when to search synced data with search_data and open results with fetch_record, read live with read_data, and make changes with run_script.
---

# Read and act on connected apps

Three Corsair tools reach the user's data:

| | `search_data` | `read_data` | `run_script` |
| --- | --- | --- | --- |
| Reads | Data Corsair has already synced (Slack messages, Gmail, Calendar and so on) | The app's live API | The app's live API |
| Writes | No | No: the script stops at the first write, before that write runs | Yes: send, create, update, delete |
| Best for | Finding things ("what did Sarah say about the refund?") | Current state and exact lists | Any change |

Start with `search_data` when the user is looking for something. Use `read_data` when they need the current state or a complete list (every open issue, today's events). Use `run_script` only to change something. If the server has no `read_data` tool, use `run_script` for live reads too.

## search_data

Matching is by keyword with stemming, not by meaning. So:

- Put the main terms in `query` and synonyms in `keywords`. For "refund requests": `keywords: ["refund", "chargeback", "money back"]`.
- Put people, emails, channels, repos, projects and companies in `about`, not in `query`. `about: ["Sarah Chen"]` also matches messages she wrote.
- Put time limits in `after` and `before` as ISO timestamps, not in `query`. Work out the dates from today's date first.
- Narrow with `plugins` (`["slack", "gmail"]`) and `entityTypes` (`["messages"]`, `["events"]`) when you know where the answer lives.
- For a question with several parts, make one call per part.

- For the newest items ("my latest emails"), set `sort: "recent"`. Every word of `query` must then appear, and `query` can be empty.

Each result shows its app, date, title, the text that matched and an `id`. Often that's enough to answer. When it isn't, such as to read a whole email, document or meeting notes, open it with `fetch_record`:

- Pass the `id` from `search_data`, or up to 20 of them in `ids` to read several in one call.
- Long text comes in pages, and the reply says when there is more. Ask for the next one with `page`.
- It reads Corsair's synced copy, not the app, so it answers fast. For the current state, use `read_data`.

No match means nothing in the synced copy matched. It doesn't mean the thing doesn't exist. Try other keywords, then a live read with `read_data`.

## read_data and run_script

Both take the same code: the body of an async function. `corsair` is the only thing in scope, and you `return` the result. There is no network, filesystem or `import`.

1. Find the action: `list_integration_operations {"integration": "slack", "type": "api"}`.
2. Get its exact arguments: `list_integration_operations {"integration": "slack", "operation": "slack.api.messages.post"}`. Don't guess argument names.
3. Run it: reads with `read_data`, changes with `run_script`. Do the lookup and the action in one `run_script` call with ordinary JS rather than several round trips:

```js
const { channels = [] } = await corsair.slack.api.channels.list({});
const ships = channels.find((c) => c.name === 'ships');
if (!ships) return 'No #ships channel';
return await corsair.slack.api.messages.post({ channel: ships.id, text: 'Deploy finished' });
```

- Return only what answers the question. Map large responses down to the fields you need; very long results are cut short in the text you get back.
- Change something only when the user asked for that change. If they didn't say exactly what gets sent or changed, or the change messages other people, deletes, or touches many records, say what you'll do and wait for a yes.
- If `read_data` stops because the script reached a write, don't rerun it with `run_script` unless the user asked for that change.
- If the script fails, read the error:
  - "is not connected": connect the app first (see corsair-connect-apps), then run it again.
  - "Approval required", "requires user approval", "was denied", "timed out waiting for approval", or "is blocked by permission mode": see corsair-approvals.
  - A rejected argument: check the operation's schema again and fix the call.
- A script that fails partway has already made the changes before the failing line. Rerun only the part that didn't happen.
- If a tool reports a problem with Corsair itself, tell the user what it said and stop. Don't work around it.

## Doing it later instead of now

`run_script` does the work once, now. For something that should happen every time an event occurs or on a schedule, use `add_triggers` (see corsair-automations).
