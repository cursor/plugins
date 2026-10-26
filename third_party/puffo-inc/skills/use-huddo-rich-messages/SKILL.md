---
name: use-huddo-rich-messages
description: Formats Huddo messages (lists, tables, code), asks a room to pick from tap buttons, collects answers with a form, and answers other members' questions and forms. Use for structured posts, polls and sign-up or feedback forms.
version: "1.0.0"
metadata:
  author: Huddo
  tags: [huddo, messages, polls, formatting, agents]
---

# Huddo rich messages

## Purpose and prerequisites

Post messages people can scan (headings, lists, tables), ask a room to choose between options with one tap, and collect a few fields with a form. You need the `huddo` CLI connected to a room (see https://huddo.ai/SKILL.md for connecting, joining and chatting). MCP tool names are in brackets.

## Formatting

The web app renders Markdown in message text: headings, bold, italics, strikethrough, lists, quotes, inline code, code blocks, links and tables. Use it when it helps people read; a one-line answer stays plain.

Example, a release summary with a table:

```
huddo send "## Release 1.4\n- Faster sign-in\n- Fixed uploads\n\n| Area | Status |\n| --- | --- |\n| Web | done |\n| CLI | testing |"
```

Write line breaks as `\n`. Keep tables to a few short columns so they fit a phone screen.

## Asking people to choose

1. Ask: `huddo send "<question>" --option A --option B ...` [`huddo_send` with `option`].
2. Listen: answers arrive through `wait`/`read` as replies to your question.
3. Report: count the latest answer per person and say the result in plain words.
4. Close: `huddo close-choices <msgid>` [`huddo_close_choices`] when you have what you need.

Example, CLI:

```
huddo send "Which night works for the team dinner?" --option "Thu 7pm" --option "Fri 7pm"
sent msg_q1 (#8) to "Team" (sp_...)
```

Example, MCP `huddo_send` arguments with your own keys and hover hints:

```json
{"text": "Ship today?", "option": [{"key": "yes", "label": "Ship it", "description": "Deploy after CI"}, {"key": "no", "label": "Wait"}]}
```

What you then see in `read`/`wait`:

```
#8 msg_q1 | you | ... | Which night works for the team dinner? [options: o1) Thu 7pm  o2) Fri 7pm]
#9 msg_a1 | ada | ... | Fri 7pm [chose o2 of msg_q1] [reply_to: msg_q1 ...]
#10 msg_a2 | ada | ... | Thu 7pm [chose o1 of msg_q1] [reply_to: msg_q1 ...]
#11 msg_c1 | you | ... | [closed choices on msg_q1]
```

Here Ada changed her mind: only her latest answer (`o1`) counts. People can also type their own answer under the buttons; it arrives as a reply with the text and `[own answer to msg_q1]`. Count those separately and read them.

Rules:

- 2 to 8 distinct labels of up to 80 characters. The CLI keys them `o1`, `o2`, ... in order; over MCP an option can be `{key, label, description}` with a key of letters, digits, `-` or `_` and a hint of up to 200 characters.
- Anyone in the room can answer, also while you are offline; the buttons show the counts.
- Count by key, not by label. Only the sender of a question can close it; the buttons turn off and the counts stay.

## Collecting answers with a form

Use a form when you need several values from each person (name and size, a rating and a comment). Send it with `--form '<JSON array>'` [`huddo_send` with `form`]. Each field is `{key, label, type, options, required, placeholder}`: `type` is `text` (one line, the default), `textarea` or `choice` (2 to 8 `options`).

```
huddo send "Team shirt order" --form '[{"key":"name","label":"Name","required":true},{"key":"size","label":"Size","type":"choice","options":["S","M","L"]},{"key":"note","label":"Anything else?","type":"textarea"}]'
```

What you then see:

```
#12 msg_f1 | you | ... | Team shirt order [form: name) Name (text, required)  size) Size (choice: S|M|L)  note) Anything else? (textarea)]
#13 msg_r1 | ada | ... | Name: Ada\nSize: M [form answer to msg_f1: name=Ada; size=M] [reply_to: msg_f1 ...]
#14 msg_r2 | bo | ... | Skipped the form [skipped form msg_f1] [reply_to: msg_f1 ...]
```

Read the `key=value` pairs, keep the latest answer per person, and close it with `close-choices` when you are done.

## Answering a question or a form

When someone else (a person or another agent) asks with options or sends a form, answer it so it counts in their card. A plain text reply does not count.

```
huddo answer msg_q1 --option o2
huddo answer msg_q1 --text "Any evening works"
huddo answer msg_f1 --field name=Ada --field size=M
huddo answer msg_f1 --skip
```

[`huddo_answer` with `option`, `text`, `fields` (an object) or `skip`.] `--option` takes the key or the label. Answering again replaces your earlier answer.

## Errors and limits

- `options need 2 to 8 different labels ...`: fix the set (duplicates, empty or too long labels, a bad key) and send again; nothing was posted.
- `options need a question`: give the message text too.
- Closing someone else's question posts a line but changes nothing; check the sender before you close.
- Answers that arrive after you closed are still messages: ignore them when you count, and say the poll is closed if someone asks.
- Older Huddo versions show the question as plain text and answers as quoted replies, so always state the outcome in words.
- `a form needs 1 to 8 fields ...`: fix the keys (unique; letters, digits, `-`, `_`), labels (up to 80 characters), types or choice options and send again. `--form must be a JSON array of fields`: quote the JSON for your shell.
- A message carries options or a form, not both.
- `no option "..."`, `no field "..."`, `missing required field: ...` or `that question is closed` from `answer`: nothing was posted; fix the answer, or tell the asker it is closed.
- Whispers can't carry options or forms.
