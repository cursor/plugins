---
name: port-github-app-to-origin
description: >-
  Plans the port of an existing GitHub App to a Cursor Origin App. Use when the
  task is to bring a GitHub App to Origin or compare what it uses against the
  Origin API. Reads the app's needs out of its code, maps them onto the live
  Origin spec, and writes a porting brief with feedback for Cursor. Planning
  only.
license: MIT
compatibility: >-
  Needs network access to https://cursor.com/docs/api/origin/* at run time.
---

# Port a GitHub App to an Origin App

Run inside the app's codebase. The output is a porting brief
(`references/brief-template.md`): what maps, what changes shape, what is not
available today, and what to tell Cursor. This skill plans; it does not write
or change code unless the user explicitly asks for that after reading the
brief.

The `origin-api` skill in this plugin covers the docs and the rules to check
first; follow it. Two rules on top:

1. **Discover, do not ask.** Read permissions, events, handlers, calls, token
   minting, and the receiver out of the code. Anything you cannot find becomes
   an open question.
2. **Feedback describes use cases, not the team's code.** Team-facing parts of
   the brief may cite files and lines. The Feedback for Cursor section names
   only what the app needs to do and what Origin lacks for it, in Origin
   terms, with no file paths, module names, framework internals, or
   repository names.

## Suggested procedure

Adapt the steps to the app. The brief format matters most in its Feedback
section.

1. **Load the spec.** A brief needs broad coverage, so fetch the full
   `openapi.yaml` and `llms-full.txt` (see `origin-api` for URLs). Record
   `info.version` and the fetch time for provenance. Build the index per
   `references/spec-mapping.md`.
2. **Discover** per `references/discovery.md`, including payload fields read
   only for logging and calls the framework makes on the app's behalf. Note
   what you looked for and did not find.
3. **Map** each capability (`references/spec-mapping.md`). Map the payload
   fields the code reads, not only the event names; if a payload lacks a
   field the REST resource has, a follow-up read is the usual answer
   (`reference/event-payloads.md`). Check `references/origin-isms.md` before calling
   anything a gap, and `references/gap-bar.md` before writing feedback. A
   capability the Origin docs do not mention is not available today and gets
   a question. A behavior the docs neither confirm nor deny becomes a
   question plus a first-run step that observes it, rather than an assumption
   carried over from the app's current platform.
4. **Write the brief** per `references/brief-template.md`: guidance and a
   default outline, not a form. Every Origin claim names an `operationId`, a
   slug, or a `reference/<anchor>.md` page. When there is feedback, also write the
   Feedback section to `ORIGIN-FEEDBACK.md` beside the brief.
5. **Self-check** before finishing: every Origin claim resolves in the
   fetched files; every gap has a feedback entry that names a tradeoff from
   `gap-bar.md`; the Feedback section and `ORIGIN-FEEDBACK.md` contain nothing
   that reveals the team's internals; the summary names the native-or-mirror
   question.

## Not in scope

Writing or changing code without the user's explicit ask. Choosing a
language, framework, or client. Estimating in time. Sending feedback to
Cursor yourself; the brief carries it and the team sends it.

## Reference files

| File | Read when |
| --- | --- |
| `origin-api` skill (install both) | First. Docs pointers and the rules to check. |
| `references/discovery.md` | Scanning the codebase. |
| `references/spec-mapping.md` | Building the index. Matching calls, events, and fields. |
| `references/origin-isms.md` | Labeling a capability that maps differently. |
| `references/gap-bar.md` | Deciding what is feedback for Cursor, and writing the entry. |
| `references/brief-template.md` | Writing the brief and the feedback file. |
