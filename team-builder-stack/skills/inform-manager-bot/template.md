# Inform manager bot: the template

The shape of a note. Fill every slot marked with angle brackets, and link to the task list and the record, not copies of them. A changed task uses Changed in place of Done. A check the manager bot asked for uses its own form.

## A note to the manager bot

```markdown
**<Unit>: <n> task(s) done.** or **<Unit>: blocked.** or **<Unit>: <n> task(s) parked.** or **<Unit>: <n> task(s) cancelled.** or **<Unit>: <n> task(s) moved.** or **<Unit>: <n> task(s) rescoped.**
- Done: <outcome> (<task link>), or nothing new
- Changed: <what changed>, by the person in chat ("<their words>") (<task link>)
- Waiting on: <who, for what>, or nothing
- Needed from you: nothing, a decision on <what> by <when>, an unblock: <what>, or update <line> on today's brief
```

## A check the manager bot asked for

```markdown
**<Unit>: <item> checked.**
- Item: <the one item the manager bot tracks it by, such as a meeting's calendar event id> (<link>)
- Outcome: <the checked result, in one sentence> (<source link>)
- Changed: <each task done, filed, or moved> (<task link>), or nothing
- Waiting on: <who, for what>, or nothing
- Needed from you: nothing, an unblock: <what>, or update <line> on today's brief
```

## How it closed, in the task list

```markdown
Done <date>. <one-line outcome> (<link to the result>). Closed: <you said so in chat | finished by <bot> | found finished by a scheduled run>.
<Parked | Cancelled | Moved to <date> | Rescoped> <date>. "<the person's words>". Changed by the person in chat.
```
