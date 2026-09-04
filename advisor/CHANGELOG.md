# Changelog

## 1.0.0

- Initial Advisor plugin release.
- Skill: `advisor` (`/advisor [model|off|status|ask ...|nudge on|off]`), usable as a Custom Mode.
- Agent: `advisor-subagent`, a read-only subagent pinned to Grok 4.6 at xhigh effort by default (any model via `/advisor <model>`) that returns a verdict and guidance.
- Hooks: track edits since the last consult, log each consult to `.cursor/advisor/log.md`, and nudge a pre-completion consult at the end of a turn.
