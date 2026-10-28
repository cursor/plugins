---
name: slides
description: Create portable HTML explainer slides with progressive reveals, keyboard navigation, mobile layouts, and deep links. Use for a slide deck or step-by-step presentation.
---

# slides

Resolve all bundled paths from this SKILL.md file, never from a hard-coded
agent installation directory. The plugin root is two directories above this
skill. The complete `yes` plugin is the supported installation unit.

Write and revise local source files. Deliver a single self-contained HTML file
by default, or an HTML + assets bundle when requested. Keep essential viewing
features usable without network access or persistent storage. Do not upload,
publish, or change visibility unless requested. Review the actual rendered
output on desktop and mobile; report unavailable checks honestly.

Before writing content, plan it with the sibling `design` skill: write
`learning-brief.md`, or reuse the one a course has already written.

Read [the authoring guide](references/authoring.md) for schemas and runtime behavior.

Copy `template.html` to the output project and author its slide sections. Keep
the embedded runtime intact. `example.html` demonstrates the supported features.
Use `uv run build.py unit <deck.html> --id ID --out DIR` when assembling a course.
