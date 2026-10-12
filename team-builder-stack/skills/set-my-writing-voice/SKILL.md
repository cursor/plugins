---
name: set-my-writing-voice
description: "Use when bots should sound like the person or their voice changed; writes their Writing voice standard skill from their own writing, after a yes."
---

# Set my writing voice

**Type:** workflow skill.

One voice skill, a standard skill named Writing voice by default, that every bot follows before it writes for a person, so its rules are never copied into other skills. It holds how the person sounds. A brand standard or a compliance guideline is a separate standard skill, as [Standard, utility, or workflow-specific](../write-a-workflow-skill/references/workflow-skill.md#standard-utility-or-workflow-specific) says.

## Steps

1. Read the team spec. If Your workflows names a voice skill in use, open it in the person's library and update it from step 3. Otherwise write one from step 2.
2. Read how they really write. With their permission, open recent things they wrote in each place their bots will write, such as sent email, chat messages, or documents, or ask them to point you to some. Ask which pieces they're proud of, and why. If they'd rather, read their recent chats in two or three slices by date, with a fresh subagent for each, and keep what shows up in two or more: tone, words they use and avoid, and the corrections they made. Ask about tone, words, and format only where their writing doesn't answer it.
3. When bots have drafted for the person, compare a few of those drafts with what the person actually sent, read only, from their sent mail or messages. Turn each recurring change into a habit or an example, and carry those findings into step 4 or step 5.
4. Write it. Fill every slot in the [template](references/template.md) from their own words and writing, with names swapped for made-up ones. Start from plain words, short sentences, and technical detail only when asked, and change that only where their writing says otherwise. If a slot has no answer, ask, or mark it.
5. Or update it. List every difference between the saved skill and what they wrote recently, plus any corrections in this conversation. Propose edits, one line each, with the reason. Keep every part nothing contradicts.
6. Show the full skill or the edits, and ask with a short multiple-choice question: save it, change something, or not now.
7. Check the name is free in the library and isn't a Team Builder skill's name. The default is `writing-voice`. Save it after a yes, yourself, through Grok Bot's own way of saving a skill, with no copy left in a working folder. A change reaches every bot that runs it, so say so when you ask. Then have Verify work read the saved version back against what was agreed before you say it's done.
8. After a yes, record its name as the voice skill in use under Your workflows.

## Outcomes

Say which one happened: **Written**, **Current** (nothing needed changing), **Updated** (the listed edits were saved), or **Left as is** (the person chose not to apply them).

## What good looks like

- Every rule comes from the person's writing or answers, or is marked.
- The examples are the person's own writing, not yours.
- Someone who has never met the person could write a message they would sign.

## Team spec

<!-- team-builder-stack:begin spec workflows -->
Read the team spec at `/workspace/team-builder-stack/team-spec.md` first. This skill uses the sections below. If the spec or a section is missing, do what the line says, and mention once that Build my team can fill it in.

- **Your workflows.** If missing: Check the person’s skill library for what is already saved, and ask where each template lives today.
<!-- team-builder-stack:end spec -->

## Example

A good Words to avoid section in a writing voice skill, with made-up names:

> **Words to avoid.** "Client" (say "customer"). "Touch base" and "circle back". "I hope you're well" or any other greeting before the news. Exclamation marks in anything a customer reads.

An update, proposed:

> Since the voice skill was saved, you cut greetings from three drafts and started writing "customer, never client". Two edits: add "customer, never client" to Words to use, and change the email format to five lines at most. Apply both, pick one, or leave it as is?
