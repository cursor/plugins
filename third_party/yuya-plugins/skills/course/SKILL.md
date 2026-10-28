---
name: course
description: Assemble a portable HTML learning course from narrated videos, slides, and quizzes with an outline, local progress, and missed-question review. Use for multiple lessons or a self-study course.
---

# course

Resolve all bundled paths from this SKILL.md file, never from a hard-coded
agent installation directory. The plugin root is two directories above this
skill. The complete `yes` plugin is the supported installation unit.

Write and revise local source files. Deliver a single self-contained HTML file
by default, or an HTML + assets bundle when requested. Keep essential viewing
features usable without network access or persistent storage. Do not upload,
publish, or change visibility unless requested. Review the actual rendered
output on desktop and mobile; report unavailable checks honestly.

Read [the authoring guide](references/authoring.md) for schemas and runtime behavior.

Run `uv run <this-skill-dir>/build.py build <course-dir>`.
Add `--format bundle` for a sibling `<name>-bundle/index.html` and assets directory;
otherwise the output is one HTML file. `--max-bytes N` optionally enforces a host limit.

Run `shoot` and `check` after building. Progress is local to the browser and may
be unavailable in sandboxed viewers; it is not a server-backed learner account.
A host page that offers its own store can keep progress there: pass
`--host-script FILE` defining `window.YESHost.storage` (see the authoring guide).

Write the learning brief with the sibling `design` skill, then plan the
lessons, brief one writer per lesson with `lesson-brief.md`, and edit the
drafts before building; the orchestration steps are in the authoring guide.
