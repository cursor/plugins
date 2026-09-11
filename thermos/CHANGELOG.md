# Changelog

## 1.0.1

- Parents resolve and pass absolute rubric `SKILL.md` paths (or inlined bodies)
  when spawning thermo review subagents.
- Subagent agents prefer parent-provided rubrics and no longer instruct models
  to search for or invoke thermos slash skills (Task subagents cannot execute
  those).

## 1.0.0

- Initial Thermos plugin release.
- Skills: `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`, `thermos`.
- Agents: `thermo-nuclear-review-subagent`, `thermo-nuclear-code-quality-review-subagent`.
- Architecture diagram embedded as a mermaid block in README.
