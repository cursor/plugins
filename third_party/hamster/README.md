# Hamster

Cursor plugin that connects agents to [Hamster](https://tryhamster.com) through Hamster's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Hamster helps a product team agree on what to build before agents build it. Each change starts as a Brief: why it matters, its constraints, and what done looks like. Hamster turns an approved Brief into a Plan and Tasks, and can ship it as a pull request. The MCP server exposes tools to read and update Briefs, Tasks, Plans, Initiatives, Documents, and Notes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Hamster**.
3. Click **Install**, then sign in to Hamster and authorize the connection when Cursor prompts you.

Or run `/add-plugin hamster` in chat.

## MCP

```json
{
  "mcpServers": {
    "hamster": {
      "type": "http",
      "url": "https://tryhamster.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for Hamster sign-in when the plugin connects.

## Skills

- `setup`: installs the Hamster CLI if it is missing, signs you in, and syncs the plan into the repository's `.hamster/` folder.
- `ask-hamster`: answers questions about workspace priorities, blockers, and decisions.
- `ship`: executes a brief in parallel waves, validates, reviews, and commits. Opens a pull request only when you ask.
- `plan-hamster`: read-only analysis of a brief and its task waves.
- `resume-hamster`: resumes an interrupted `ship` run.
- `review-hamster`: two-pass code review of the current branch.
- `qa`: runs the project's tests and checks.
- `retro`: engineering retrospective from git history.

## Agents

- `task-executor`: implements all subtasks of one Hamster task.
- `wave-reviewer`: reviews the changes from one execution wave.

The `setup` skill downloads the Hamster CLI installer from https://tryhamster.com/cli/install when the `hamster` command is missing.

## Source

Skills, agents, and logo are copied from [gethamster/plugin](https://github.com/gethamster/plugin) at commit `ebb8333`.

- Docs: https://tryhamster.com/docs/hamster-studio/plugin
- Support: support@tryhamster.com

## License

MIT
