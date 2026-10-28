---
name: explain
description: Create a self-contained, scrollable HTML explanation of a topic, mechanism, or decision. Use for an explainer page; use slides, video, quiz, or course for those formats.
---

# explain

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

Follow the brief's learner, objectives and sequence. Where the brief leaves
the order open, open on the concrete problem, name the parts the mechanism uses, then walk a small worked
example through the mechanism and its trade-offs.
Distinguish sourced facts from assumptions and include source links near claims.

Create `explanation.html` with inline CSS and JavaScript. Use system fonts and
inline SVG or embedded images; do not depend on a CDN. Use semantic sections,
readable text, visible focus indicators, and controls with accessible labels.
Add interaction only when changing a value or revealing a step aids understanding.
Give each section the brief's thinking point: a question or prediction the
reader attempts before the answer is revealed. End with questions answered
unaided, not a recap.

For a user-stepped presentation use the sibling `slides` skill. For narration
use `video`; for two-character narration use `zundamon-video`; for assessment
use `quiz`; for multiple lessons use `course`. These are choices of output
format, not mandatory steps for an ordinary explanation.

Give each Japanese term of art one form ([terms](../../references/terms-ja.md)).
Check the explanation against the sources, then render it at desktop and phone
widths (`uv run <plugin>/scripts/check_mobile.py explanation.html` lists anything
that makes a phone scroll sideways). Test the controls, keyboard focus, and absence of external resource
requests. Return the file and say which checks you completed.
