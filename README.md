# Cursor plugins

Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor-plugin/plugin.json` manifest.

## Plugins

| `name` | Plugin | Author | Category | `description` (from marketplace) |
|:-------|:-------|:-------|:---------|:-------------------------------------|
| `continual-learning` | [Continual Learning](continual-learning/) | Cursor | Developer Tools | Learns from your transcripts: promote stable preferences and workspace facts into AGENTS.md as plain bullets so every session starts aligned with how you work. |
| `cursor-team-kit` | [Cursor Team Kit](cursor-team-kit/) | Cursor | Developer Tools | Cursor’s internal shipping playbook as skills—triage CI, fix failures, open and refresh PRs, resolve merge conflicts, run smoke and compile checks, clean noisy diffs, and summarize what landed. |
| `create-plugin` | [Create Plugin](create-plugin/) | Cursor | Developer Tools | Scaffold marketplace-ready Cursor plugins—folder layout, manifests, optional skills and MCP—and run quality checks before you publish. |
| `agent-compatibility` | [Agent Compatibility](agent-compatibility/) | Cursor | Developer Tools | CLI-backed audits of repo reality—verify install scripts, CI, and docs match what actually runs so agents (and humans) get a trustworthy quick start. |
| `cli-for-agent` | [CLI for Agents](cli-for-agent/) | Cursor | Developer Tools | CLI design patterns for automation: non-interactive flags, layered --help with examples, stdin pipelines, clear errors, idempotency, and dry-run so agents never stall on prompts. |

Author values match each plugin’s `plugin.json` `author.name` (Cursor lists `plugins@cursor.com` in the manifest).

## Repository structure

This is a multi-plugin marketplace repository. The root `.cursor-plugin/marketplace.json` lists all plugins, and each plugin has its own manifest:

```
plugins/
├── .cursor-plugin/
│   └── marketplace.json       # Marketplace manifest (lists all plugins)
├── plugin-name/
│   ├── .cursor-plugin/
│   │   └── plugin.json        # Per-plugin manifest
│   ├── skills/                # Agent skills (SKILL.md with frontmatter)
│   ├── rules/                 # Cursor rules (.mdc files)
│   ├── mcp.json               # MCP server definitions
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
└── ...
```

## License

MIT
