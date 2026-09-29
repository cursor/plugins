# Requirements

dyl-stack layers on other plugins. Check the ones your skill needs before any work. If one is missing, stop, name it, and tell the user to run `/add-plugin <name>`. Do not improvise the missing piece.

| Plugin | Installed when | Reach its files |
|---|---|---|
| `pstack` | `setup-pstack` is in your skill list | Most pstack skills are slash-only and hidden from the list. They sit beside `setup-pstack`: `<setup-pstack dir>/../poteto-mode/SKILL.md`, `../poteto-mode/playbooks/<name>.md`, `../principle-<name>/SKILL.md`, `../bro/SKILL.md`, `../unslop/SKILL.md`. |
| `cursor-team-kit` | `control-ui`, `verify-this`, and `deslop` are in your skill list | Their listed paths. |
| `thermos` | `thermo-nuclear-review-subagent` and `thermo-nuclear-code-quality-review-subagent` are available Task subagent types | Launch them by subagent type. |
| `figma` | `figma-design-to-code` is in your skill list and a Figma MCP tool call succeeds | Its listed path. |
