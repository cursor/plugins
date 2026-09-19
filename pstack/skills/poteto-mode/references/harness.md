# Spawn harness

Use this session's spawn tool. Agent type slugs are kebab-case. Never put a space in `subagent_type`.

## Types

| Role | Slug |
| --- | --- |
| poteto | `poteto-agent` |
| comments | `comment-sicko` |
| generic | the generic type this session's spawn tool lists |
| explore | `explore` |
| plan | `plan` |

If the spawn tool lists a plugin prefix, use the prefixed form.

If lookup fails, retry the unprefixed slug, then the prefixed one. If that fails, spawn `poteto-agent` with the target agent's markdown as the prompt. Do not stop the playbook.

## Models

Use `/setup-pstack` slugs. Pass only a slug this session's spawn tool lists. Omit `model` when the role is `inherit-parent` or `auto`.
