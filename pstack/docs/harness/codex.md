# pstack in Codex

Apply this adapter to the bundled skills, playbooks, agent briefs, and guides. Follow current session instructions, repository rules, permissions, and tool schemas.

- A pstack slash command names a bundled skill. Read its sibling `skills/<name>/SKILL.md` directly when applying it from another skill. Users can select skills from the Codex skill picker. Paths to bundled files are relative to the plugin root.
- Use the session's plan tool for todolists and its user-input tool when available and appropriate. Use the shell for repository commands and search, subject to repository rules.
- Cursor Task and project workers refer to the session's supported delegation tools. Delegate only when authorized by current instructions. Use `agents/poteto-agent.md` and `agents/comment-sicko.md` as brief material when applicable. Supply only fields and model names confirmed by the current tool. Preserve read-only and isolation requirements. If a capability is unavailable, do eligible work in the current session.
- Default to the session's model and reasoning effort. Cursor, Claude and Gemini model strings in bundled playbooks describe roles. If a role needs a distinct model and the session cannot supply it, disclose that limitation. Never claim model diversity for runs on the same model.
- Use available browser, terminal, and test tools to gather equivalent verification evidence. Use the session's approved PR tools or the forge CLI as appropriate. Handle existing review threads as ordinary forge review threads. Skip Cursor-only automation, Bugbot setup, transcript paths, and cloud-agent operations when there is no supported equivalent. Report resulting verification gaps.
- Use Codex session configuration and skill invocation. Do not write Cursor rules, create persistent jobs, change permissions, push, or merge solely because a playbook says to.
