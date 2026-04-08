# Cursor plugins

Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor-plugin/plugin.json` manifest.

## Plugins

| `name` | Plugin | Author | Category | Notes |
|:-------|:-------|:-------|:---------|:------|
| `appwrite` | [Appwrite](appwrite/) | Appwrite | Developer Tools | Appwrite API MCP (`uvx mcp-server-appwrite`) + skills; configure `.mcp.json` / Cursor MCP env. |
| `continual-learning` | [Continual Learning](continual-learning/) | Cursor | Developer Tools | Transcript-driven updates to AGENTS.md. |
| `cursor-team-kit` | [Cursor Team Kit](cursor-team-kit/) | Cursor | Developer Tools | CI, PR, and shipping skills. |
| `create-plugin` | [Create Plugin](create-plugin/) | Cursor | Developer Tools | Plugin scaffolding and checks. |
| `ralph-loop` | [Ralph Loop](ralph-loop/) | Cursor | Developer Tools | Iterative agent loops with hooks. |
| `teaching` | [Teaching](teaching/) | Cursor | Utilities | Skill maps, practice plans, retrospectives. |
| `agent-compatibility` | [Agent Compatibility](agent-compatibility/) | Cursor | Developer Tools | Audits docs/CI vs runnable reality. |
| `cli-for-agent` | [CLI for Agents](cli-for-agent/) | Cursor | Developer Tools | CLI design patterns for automation. |

Marketplace copy is **composed** from structured `marketplaceDetail` in each `.cursor-plugin/plugin.json` (`USER LEVEL`, `PROJECT LEVEL`, overview line, `BEST SUITED FOR` bullets) so the Cursor detail view (`marketplace-editor__description`) stays a single paragraph **without duplicated “integrate with your projects” phrasing**—edit the YAML-like fields, then run `npm run compose`.

### After Cursor refreshes plugin cache

Cursor may overwrite `~/.cursor/plugins/cache/cursor-public/**` when it re-downloads packages. To re-apply manifests from this repo:

```bash
npm run after-cursor-update
```

That runs `compose` then `sync-cache`. Optionally install a git hook: `powershell -ExecutionPolicy Bypass -File scripts/install-git-post-merge-hook.ps1` (runs the same after `git pull`).

Author values match each plugin’s `plugin.json` `author.name` where listed (Cursor lists `plugins@cursor.com` in Cursor-authored manifests).

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
