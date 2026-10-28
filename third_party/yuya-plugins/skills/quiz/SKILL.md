---
name: quiz
description: Create a portable HTML multiple-choice quiz with immediate feedback and explanations. Use for comprehension checks, practice questions, or 確認テスト.
---

# quiz

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

Run `uv run <this-skill-dir>/build.py build <quiz.json>`.
Add `--format bundle` for a sibling `<name>-bundle/index.html` and assets directory;
otherwise the output is one HTML file. `--max-bytes N` optionally enforces a host limit.
