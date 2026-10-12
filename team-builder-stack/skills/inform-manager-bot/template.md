# Inform manager bot: the template

The shape of a note. Fill every slot marked with angle brackets, and link to the task list and the record, not copies of them.

## A note to the manager bot

```markdown
**<Unit>: <n> task(s) done.** or **<Unit>: blocked.**
- Done: <outcome> (<task link>), or nothing new
- Waiting on: <who, for what>, or nothing
- Needed from you: nothing, a decision on <what> by <when>, or an unblock: <what>
```

## How it closed, in the task list

```markdown
Done <date>. <one-line outcome> (<link to the result>). Closed: <you said so in chat | finished by <bot> | found finished by a scheduled run>.
```
