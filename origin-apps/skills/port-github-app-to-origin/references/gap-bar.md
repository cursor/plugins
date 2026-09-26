# The feedback bar and the feedback format

Cursor wants to hear what the team needs from Origin. Raise anything that
blocks the team's core flow, costs them correctness, security, or scale, or
that they would like Origin to do. The bar below sorts items into feedback
for Cursor (a capability Origin should add) and questions for the team
(decisions the team must make); it does not decide whether to speak up. It
also orders feedback so the items that block the port are read first.

- A difference is any capability whose Origin path is not a straight
  substitution.
- A workaround reaches the same outcome with the current API by another
  route: a follow-up read, a re-keyed identifier, a path change, a
  client-side filter, a marker the app controls. Noting the workaround with
  its tradeoff is often the right answer.
- A gap is a difference with no workaround, or a workaround whose tradeoff
  meets one of the tests below. Gaps become feedback entries; when there is
  at least one, the Feedback section is also written to `ORIGIN-FEEDBACK.md`
  beside the brief.

## Tradeoffs that make a workaround insufficient

| Tradeoff | Test |
| --- | --- |
| Fan-out at scale | Calls per event multiply by a factor that grows with repository or activity size, and the app's volume makes that budget-relevant. One bounded extra read per event is a workaround. |
| Correctness risk | The workaround can return a wrong answer, not only a slower one: heuristic matching of the app's own rows, inferring a pull request from a SHA several versions share, assembling a URL whose format is not contractual. |
| Security posture | The workaround needs a broader scope, a longer-lived token, or a user credential where an installation token should do. |
| Customer-visible behavior | The workaround changes what the team's users see or can do. |
| Load-bearing | The capability sits on the hello-world path or the team's stated core flow. |

## Usually a workaround or a question

- Anything `origin-isms.md` marks `maps`: a documented path exists.
- A field or filter the code does not use.
- A convention difference (pagination style, identifier form, URL fields)
  where the Origin convention is a mechanical substitution.
- Anything the changelog says shipped or the spec already carries. Re-read
  the live spec before writing feedback.
- A capability the Origin docs do not mention: not available today, with a
  question. The team should still ask if they need it.
- A query the app runs against a search API, when the spec has no search
  operation for that resource. A list operation with its filters plus a
  client-side predicate is the idiom; if that fails the fan-out test, the
  feedback is usually about a filter.

One pattern that does meet the bar: a state change the app reacts to that
has no event, when reacting to that change is the app's purpose and the
state is invisible until an unrelated event arrives. That fails correctness
and customer-visible behavior when the app is a gate. Write the feedback
about the event.

## The feedback format

One entry per gap, in the brief's "Feedback for Cursor" section. A suggested
shape, not a form; keep whatever lines carry information. Describe the use
case and the API gap relative to it, in Origin terms. No file paths,
module names, framework internals, code structure, or repository names; those
belong in the team-facing sections of the brief.

```markdown
### Feedback: <capability, in Origin terms>

- **Use case:** the app needs to <do what, for whom>, <how often or at what volume>.
- **Origin today:** <what is missing or costly for that use case; cite the closest `operationId`, slug, or anchor, or "no operation">.
- **Workaround considered:** <the route and the tradeoff that makes it insufficient, or "none found">.
- **Blocking?** yes / no, for which flow.
- **Spec version checked:** `<info.version>`, <date>.
```

Describe the capability rather than proposing scope, field, or route names,
so Cursor can fit it to the API's conventions. One capability per entry.

The team sends the feedback, not you. Before they forward it, they should
strip anything that reveals their internals. A reply of "here is the idiom"
or "not planned" is useful too; record it in the brief with the label it
earns.
