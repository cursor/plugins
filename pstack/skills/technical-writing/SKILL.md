---
name: technical-writing
description: "Layered technical writing standard for docs, RFCs, READMEs, PR descriptions, and commit messages. Applies Diátaxis, Google developer style, Simplified Technical English, and Global English without flattening the writer's voice. Use for /technical-writing."
disable-model-invocation: true
---

# Technical writing

Write for a named reader who needs to do or understand one concrete thing. Facts come from the product, code, measurements, and decisions. Do not fill a gap with plausible prose.

This skill applies to documentation, RFCs, READMEs, PR descriptions, and commit messages.

Product UI strings are not documentation. Use your product's copy guidelines for those.

## Before drafting

Write down:

- the reader;
- what the reader should know or be able to do afterward;
- the evidence that supports the document;
- the one Diátaxis mode the document serves.

If the outcome is vague, the document will be vague. Research first.

## Keep a voice

Technical writing should be precise without sounding generated.

- Have an opinion when the material requires judgment. Name the tradeoff and make the call.
- Vary the rhythm. Use short sentences for conclusions. Let a longer sentence carry context that would become choppy if split into fragments.
- Acknowledge real complexity. Do not turn a difficult migration into a falsely simple success story.
- Use "I" or "we" when ownership matters. Do not hide a decision behind passive voice.
- Be specific. Names, commands, measured values, and failure modes carry more information than polished adjectives.
- Let the subject set the tone. A reference page can be dry. An explanation can sound like a knowledgeable teammate.

Apply the **unslop** skill to the finished draft. The rules below carry the load-bearing writing standard; the unslop pass catches broader prose habits.

## Layer 1: Diátaxis

Ask: **What does the reader need from this document?**

Choose one mode.

| Mode | Reader need | Contract |
|---|---|---|
| Tutorial | Learn through a guided experience | Lead the learner through a complete, safe path. Supply the choices. Produce a visible result. |
| How-to guide | Complete a real task | Start from the goal and give the shortest reliable procedure. State prerequisites and verification. |
| Reference | Look up accurate facts | Describe the interface, fields, commands, limits, defaults, and errors completely and consistently. |
| Explanation | Understand why or how | Connect causes, constraints, alternatives, and consequences. Build a mental model. |

Do not mix the contracts:

- A tutorial is not a catalog of every option.
- A how-to guide is not a lesson or an architecture essay.
- Reference does not persuade or tell a story.
- Explanation does not disguise a procedure inside paragraphs.

When one artifact contains several needs, choose the primary mode and move the other material to a linked document. A short appendix is acceptable when splitting would make the reader hunt for a fact needed on the same page.

## Layer 2: Google developer style

Ask: **Can the intended reader find and act on the point?**

- Address the reader as "you" when giving guidance.
- Use active voice and name the actor.
- Use present tense for current behavior.
- Start procedures with an imperative verb.
- Put the purpose and result before implementation detail.
- Put prerequisites before steps and verification after them.
- Use numbered lists for ordered work. Use bullets for unordered facts.
- Give headings language a reader would search for.
- Introduce code, commands, tables, and diagrams before they appear.
- Use one term for one concept. Match names in the interface and code.
- Link to the source of a fact instead of restating a second copy that can drift.

Prefer:

> Run `pnpm test` from the repository root. The command exits nonzero when a package test fails.

Avoid:

> Tests can be run in order to ensure that everything is functioning correctly.

## Layer 3: Simplified Technical English

Ask: **Can the sentence be read only one way?**

Use the writing rules from ASD-STE100, not its controlled dictionary.

- Give one instruction per numbered step.
- Keep one main claim per sentence.
- Put the condition before the action when the condition controls the action.
- Name the subject. Avoid an ambiguous "it", "this", or "they".
- Repeat the noun when a pronoun could refer to two things.
- Keep terminology stable. Do not cycle through synonyms.
- Prefer a positive instruction over a double negative.
- State units, ranges, defaults, and failure conditions.
- Expand an abbreviation at first use unless every intended reader knows it.
- Break a dense sentence before adding punctuation to rescue it.

Prefer:

> If the worker still owns a lease, wait for the lease to expire. Then restart the worker.

Avoid:

> If it still has one, do not restart it until that has happened.

## Layer 4: Global English

Ask: **Can a reader or agent parse the syntax without relying on local idiom?**

- Prefer a clear subject, verb, and object.
- Use common literal words.
- Avoid idioms, jokes, cultural references, and figurative phrasal verbs.
- Unpack long noun stacks. "Request retry policy" is clearer as "the retry policy for requests".
- Keep modifiers beside the words they modify.
- Use explicit connectors such as "because", "before", and "therefore" when the relationship matters.
- Give dates, times, numbers, and units in an unambiguous form.
- Do not use punctuation or typography to carry meaning that the words omit.
- Keep examples internationally legible. Do not assume a locale, calendar format, or naming convention.

Global English is not a demand for robotic prose. Simple syntax leaves more room for the actual idea.

## Surface-specific contracts

### Documentation

Name the reader and mode at the start of the work. Keep durable facts close to the code or configuration that owns them. Run every command and follow every procedure before publishing it.

### RFCs

Lead with the decision to make, the constraints, and the recommendation. Separate observed facts from judgment. Name rejected alternatives and the reason each lost. State rollout, rollback, and acceptance criteria when the proposal changes a running system.

### READMEs

Give a new reader the shortest path to a verified first result. Put deeper explanation and exhaustive reference behind links. Do not make setup depend on knowledge that appears later.

### PR descriptions

State what changes for the user or maintainer, why this change is needed, and how the reviewer can verify it. Name risk, rollout, or stack order when those facts matter. Omit boilerplate headings that would contain no useful text.

### Commit messages

Use an imperative subject that names the change. Use the body for the reason, constraint, or consequence that the diff cannot show. Do not restate the subject in paragraph form.

## Drafting sequence

1. Gather evidence and name the reader, outcome, and mode.
2. Outline in the order the reader needs, not the order the writer discovered the facts.
3. Draft the concrete claims, examples, commands, and decisions.
4. Add transitions and enough context to make the reasoning legible.
5. Apply the four layers in order. Fix mode before sentences, ambiguity before polish.
6. Apply the **unslop** skill without erasing voice or technical detail.
7. Verify commands, links, values, and promised outcomes against the real artifact.

## Review

Ask four questions:

1. Diátaxis: does every section serve the chosen mode?
2. Google developer style: can the named reader find and act on the point?
3. Simplified Technical English: can each sentence be read only one way?
4. Global English: can a non-native reader or agent parse the syntax without local knowledge?

Then read the draft aloud. Repeated sentence shapes expose dead rhythm. A sentence that sounds precise but tells the reader nothing should be deleted.
