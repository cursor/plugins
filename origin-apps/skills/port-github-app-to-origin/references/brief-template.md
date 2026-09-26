# The porting brief

The brief is for the team that owns the app, plus one section they can send
to Cursor as is. Write it as one Markdown file at the repository root
(`ORIGIN-PORTING-BRIEF.md` unless the team's docs convention says otherwise)
and print its path. A small app's brief fits on one screen; parts that have
nothing to say collapse to a line or disappear. Choose table shapes and
headings to fit the app.

## What a good brief does

- **Leads with a summary.** Three to five lines: the verdict (ports as is,
  ports with N workarounds, blocked on X), the one question that decides the
  rest (usually native or mirror), and whether there is feedback for Cursor
  and if any of it blocks.
- **Maps what the app uses to Origin.** Every capability the code relies on,
  with the Origin operation, slug, or reference page it maps to, or a
  note that nothing does. Where a webhook handler reads specific payload
  fields, say per field whether it is present, comes from the envelope, needs
  a follow-up read (and how many per event), is derivable, or is absent.
  Group by facet if the table is long. End with the scopes to request: the
  union of `x-origin-scopes.scopes` over the operations named, minus what
  `reference/scopes.md` says is automatic or implied.
- **Gives an app-specific first-run path when it helps.** The events to
  select by slug, the mirror-state check, the first event that should arrive
  and what it should carry, the first write. Generic setup steps belong to
  `reference/implementation-checklist.md`, not here. Skip for a read-only app
  with one event.
- **Adds plan notes.** What drives the size of the port (a few bullets, no
  time estimates) and how to roll it out: dual-run or cutover, what a mirror
  trial can and cannot show, what to gate.
- **Asks only what the team must decide.** Repository set, tolerable event
  volume and follow-up reads, what replaces a flow that has no Origin
  equivalent. Do not restate a row as a question.
- **Ends with two lines of provenance.** Spec `info.version` and fetch time;
  codebase and commit.
- **Closes with Feedback for Cursor.** Last section, unnumbered, written to be
  copied verbatim (`gap-bar.md` has the shape). Nothing in it reveals the
  team's internals. When it has at least one entry, also write it to
  `ORIGIN-FEEDBACK.md` beside the brief. When nothing meets the bar, no file;
  one line in the brief saying so.

## What makes it trustworthy

- Every claim about the app cites evidence: `file:line`, or "from
  `<dependency>` (documented behavior)". Team-facing sections only.
- Every claim about Origin resolves in the fetched `openapi.yaml` or
  `llms-full.txt`: an `operationId`, a slug, or a reference page. Nothing from
  memory.
- Behavior the docs do not state is a question plus a first-run step that
  observes it, never an assumption.
- Feedback for Cursor describes use cases and the API gap in Origin terms,
  with no file paths, module names, framework internals, or repository names.

## Vocabulary, if you want one

Plain notes serve the reader as well as labels. If the table needs a compact
mark, these four are shared with the other references: `maps` (a documented
path exists, same or reshaped), `workaround` (same outcome by another route;
say the tradeoff), `not-available` (nothing in the current spec; carries a
question), `gap` (no workaround, or one whose tradeoff meets a test in
`gap-bar.md`; produces a feedback entry). Size marks S/M/L, if used, mean
adapter change, new code path, product or architecture change.

## Default outline

Adapt or skip parts; the Feedback section is the one to keep exact.

```text
# Origin porting brief: <app>
Summary
1. The app today          one paragraph; observed stack; looked for, not found
2. Capability map         table(s); payload fields under webhook events; scopes line
3. First run              app-specific, five steps or fewer (optional)
4. Plan notes             size drivers; rollout (optional)
5. Questions for the team
Provenance                two lines
Feedback for Cursor       unnumbered, last, copy verbatim; also ORIGIN-FEEDBACK.md
```
