# Cursor plugins

Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor-plugin/plugin.json` manifest.

## Plugins

| Plugin | Category | Description |
|:-------|:---------|:------------|
| [Teaching](teaching/) | Utilities | Skill maps, practice plans, and feedback loops |
| [Continual Learning](continual-learning/) | Developer Tools | Incremental transcript-driven AGENTS.md memory updates with high-signal bullet points |
| [Cursor Team Kit](cursor-team-kit/) | Developer Tools | Internal-style workflows for CI, code review, shipping, and testing |
| [Cursor PM](cursor-pm/) | Developer Tools | Product management MCP bundle for Granola, Gong, Notion, and Slack |
| [Create Plugin](create-plugin/) | Developer Tools | Meta workflows for creating Cursor plugins with scaffolding and submission checks |
| [Ralph Loop](ralph-loop/) | Developer Tools | Iterative self-referential AI loops using the Ralph Wiggum technique |

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
