# Cursor plugins

Fork of [cursor/plugins](https://github.com/cursor/plugins). Each plugin folder is installable on Claude Code, Grok, Codex, and OpenCode. Skill and MCP files stay where they are.

```sh
claude plugin marketplace add rudironsoni/cursor-plugins-for-all-harnesses
claude plugin install teaching@cursor-plugins

grok plugin marketplace add rudironsoni/cursor-plugins-for-all-harnesses
grok plugin install teaching --trust

codex plugin marketplace add rudironsoni/cursor-plugins-for-all-harnesses
codex plugin install teaching
```

OpenCode has no marketplace. After you have the plugin folder, add it in `opencode.json`:

```json
{ "plugins": ["./teaching/opencode.js"] }
```

Or use the community installer, which reads this repo's Claude catalog:

```sh
npx opencode-market add rudironsoni/cursor-plugins-for-all-harnesses
npx opencode-market install teaching@cursor-plugins --opencode
```


Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor-plugin/plugin.json` manifest.

## Plugins

| `name` | Plugin | Author | Category | `description` (from marketplace) |
|:-------|:-------|:-------|:---------|:-------------------------------------|
| `teaching` | [Teaching](teaching/) | Cursor | Utilities | Skill mapping, practice plans, and learning retrospectives. |
| `continual-learning` | [Continual Learning](continual-learning/) | Cursor | Developer Tools | Incremental transcript-driven memory updates for AGENTS.md using high-signal bullet points only. |
| `cursor-team-kit` | [Cursor Team Kit](cursor-team-kit/) | Cursor | Developer Tools | Internal team workflows for CI, code review, shipping, local automation, and verification. |
| `thermos` | [Thermos](thermos/) | Cursor | Developer Tools | Thermo-nuclear branch review: deep security/correctness audits, harsh code-quality rubrics, parallel subagents, thermos orchestration, and optional merge-ready PR flows. |
| `create-plugin` | [Create Plugin](create-plugin/) | Cursor | Developer Tools | Scaffold and validate new agent plugins. |
| `ralph-loop` | [Ralph Loop](ralph-loop/) | Cursor | Developer Tools | Iterative self-referential AI loops using the Ralph Wiggum technique. |
| `agent-compatibility` | [Agent Compatibility](agent-compatibility/) | Cursor | Developer Tools | CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality. |
| `cli-for-agent` | [CLI for Agents](cli-for-agent/) | Cursor | Developer Tools | Patterns for designing CLIs that coding agents can run reliably: flags, help with examples, pipelines, errors, idempotency, dry-run. |
| `pr-review-canvas` | [PR Review Canvas](pr-review-canvas/) | Cursor | Developer Tools | Render PR diffs as review canvases grouped by importance. |
| `docs-canvas` | [Docs Canvas](docs-canvas/) | Cursor | Developer Tools | Render documentation as a navigable canvas. |
| `cursor-sdk` | [Cursor SDK](cursor-sdk/) | Cursor | Developer Tools | Build apps, scripts, and automations with the TypeScript SDK. |
| `orchestrate` | [Orchestrate](orchestrate/) | Cursor | Developer Tools | Fan large tasks out across parallel cloud agents with planners, workers, verifiers, and structured handoffs. |
| `pstack` | [pstack](pstack/) | Lauren Tan | Developer Tools | if you want to go fast, go deep first. pstack helps you write less, but higher quality code. rigorous agent workflows you can parallelize with confidence. |
| `gmail` | [Gmail](third_party/gmail/) | Cursor | Productivity | Search, read, draft, and manage email. |
| `google-drive` | [Google Drive](third_party/google-drive/) | Cursor | Productivity | Search, read, create, and share files. |
| `google-calendar` | [Google Calendar](third_party/google-calendar/) | Cursor | Productivity | Search events and schedule meetings. |
| `gong` | [Gong](third_party/gong/) | Cursor | Integrations | Pull account summaries, deal insights, and call briefs. |
| `salesforce` | [Salesforce](third_party/salesforce/) | Cursor | Integrations | Query, create, and update records in your org. |
| `playwright` | [Playwright](third_party/playwright/) | Cursor | Integrations | Navigate, click, screenshot, and test in a real browser. |
| `github` | [GitHub](third_party/github/) | Cursor | Integrations | Manage repos, issues, pull requests, and Actions. |
| `ashby` | [Ashby](third_party/ashby/) | Cursor | Integrations | Search candidates, prep interviews, and manage pipeline tasks. |
| `hubspot` | [HubSpot](third_party/hubspot/) | Cursor | Integrations | Search and update contacts, companies, deals, and tickets. |
| `intercom` | [Intercom](third_party/intercom/) | Cursor | Integrations | Search conversations, contacts, and Help Center articles. |
| `zoom` | [Zoom](third_party/zoom/) | Cursor | Integrations | Search meetings, pull transcripts, and work with Zoom Docs. |
| `x` | [X](third_party/x/) | Cursor | Integrations | Search posts, read timelines, pull trends, and manage bookmarks. |
| `clay` | [Clay](third_party/clay/) | Cursor | Integrations | Enrich people and companies, run AI research agents. |
| `circleback` | [Circleback](third_party/circleback/) | Cursor | Integrations | Search meetings, transcripts, action items, and emails. |
| `docusign` | [Docusign](third_party/docusign/) | Cursor | Integrations | Manage envelopes, templates, workflows, and agreements. |
| `navan` | [Navan](third_party/navan/) | Cursor | Integrations | Query expenses, travel bookings, policies, and cards. |
| `profound` | [Profound](third_party/profound/) | Cursor | Integrations | Track AI visibility, sentiment, and citations. |
| `juicebox` | [Juicebox](third_party/juicebox/) | Cursor | Integrations | Query recruiting analytics, shortlists, and sourcing agents. |
| `outreach` | [Outreach](third_party/outreach/) | Cursor | Integrations | Search sequences, prospects, and Kaia meetings. |
| `amplemarket` | [Amplemarket](third_party/amplemarket/) | Cursor | Integrations | Search people and companies, enrich leads, run sequences. |
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
