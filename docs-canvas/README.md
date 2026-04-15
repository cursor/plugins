# Docs Canvas

Cursor plugin for rendering documentation — architecture notes, API references, runbooks, and codebase walkthroughs — as a navigable Cursor Canvas instead of a flat markdown file.

## Status

This plugin is an **initial scaffold**. The skill structure is complete and the Canvas welcome page will surface it in the marketplace, but the skill body is intentionally a starting outline rather than a fully-tuned playbook. Expect iteration as the "docs on a canvas" pattern matures.

## What it includes

- `docs-canvas`: build a Canvas that presents structured documentation with an overview card, a navigable table of contents, mixed prose/code/diagram sections, and a references block.

## When to use

- Rendering architecture notes, design docs, or RFCs as something you can scan, not just read top-to-bottom.
- Turning a directory of markdown docs, or a single large doc, into a Canvas with jump navigation.
- Answering a codebase question with a layout richer than a single reply — sections, diagrams, tables, callouts.

Trigger it with phrases like "docs canvas", "documentation overview", "architecture walkthrough", "API reference page", or "render this doc as an interactive canvas".

## How it's organized

The skill expects a docs canvas to lead with:

1. **Overview** — short summary card: purpose, scope, audience.
2. **Table of contents** — sticky/pinned list of sections the reader can jump to.
3. **Body sections** — one per logical unit (architecture, API, examples, gotchas), mixing prose, code blocks, diagrams, callouts.
4. **References** — links to related docs, source files, RFCs, external material.

Those are a floor, not a ceiling — the skill encourages reaching for whatever representation (diagrams, tables, decision trees, worked examples) actually helps the reader for the specific topic.

## Requirements

- Cursor with Canvas enabled.
- Source material: a directory of markdown files, a single doc URL, an inline outline, or a codebase question to answer.

## License

MIT
