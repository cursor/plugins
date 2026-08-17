# Cursor plugins

Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor-plugin/plugin.json` manifest.

## Plugins

| `name` | Plugin | Author | Category | `description` (from marketplace) |
|:-------|:-------|:-------|:---------|:-------------------------------------|
| `continual-learning` | [Continual Learning](continual-learning/) | Cursor | Developer Tools | Incremental transcript-driven memory updates for AGENTS.md using high-signal bullet points only. |
| `cursor-team-kit` | [Cursor Team Kit](cursor-team-kit/) | Cursor | Developer Tools | Internal team workflows for CI, code review, shipping, local automation, and verification. |
| `thermos` | [Thermos](thermos/) | Cursor | Developer Tools | Thermo-nuclear branch review: deep security/correctness audits, harsh code-quality rubrics, parallel subagents, thermos orchestration, and optional merge-ready PR flows. |
| `create-plugin` | [Create Plugin](create-plugin/) | Cursor | Developer Tools | Scaffold and validate new agent plugins. |
| `agent-compatibility` | [Agent Compatibility](agent-compatibility/) | Cursor | Developer Tools | CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality. |
| `cli-for-agent` | [CLI for Agents](cli-for-agent/) | Cursor | Developer Tools | Patterns for designing CLIs that coding agents can run reliably: flags, help with examples, pipelines, errors, idempotency, dry-run. |
| `pr-review-canvas` | [PR Review Canvas](pr-review-canvas/) | Cursor | Developer Tools | Render PR diffs as interactive canvases organized for reviewer comprehension — groups changes by importance, separates boilerplate from core logic, and highlights tricky or unexpected code. |
| `docs-canvas` | [Docs Canvas](docs-canvas/) | Cursor | Developer Tools | Render documentation — architecture notes, API references, runbooks, and codebase walkthroughs — as a navigable canvas with sections, table of contents, diagrams, and cross-references. |
| `cursor-sdk` | [Cursor SDK](cursor-sdk/) | Cursor | Developer Tools | Build apps, scripts, CI pipelines, and automations on top of the Cursor TypeScript SDK (@cursor/sdk) — runtime selection, auth, streaming, MCP, error handling, and ready-to-extend integration patterns. |
| `orchestrate` | [Orchestrate](orchestrate/) | Cursor | Developer Tools | Fan large tasks out across parallel cloud agents with planners, workers, verifiers, and structured handoffs. |
| `pstack` | [pstack](pstack/) | Lauren Tan | Developer Tools | if you want to go fast, go deep first. pstack helps you write less, but higher quality code. rigorous agent workflows you can parallelize with confidence. |
| `gmail` | [Gmail](third_party/gmail/) | Cursor | Productivity | Connect to Gmail via Google's remote MCP server — search, read, draft, label, and manage email. |
| `google-drive` | [Google Drive](third_party/google-drive/) | Cursor | Productivity | Connect to Google Drive via Google's remote MCP server — search, read, create, share, and manage files. |
| `google-calendar` | [Google Calendar](third_party/google-calendar/) | Cursor | Productivity | Connect to Google Calendar via Google's remote MCP server — list calendars, search events, and create or update meetings. |
| `gong` | [Gong](third_party/gong/) | Cursor | Integrations | Gong MCP integration for revenue intelligence — account summaries, deal insights, and call briefs. |
| `salesforce` | [Salesforce](third_party/salesforce/) | Cursor | Integrations | Connect to Salesforce via Salesforce Hosted MCP — query, search, create, update, and traverse records in your org. |
| `apollo-io` | [Apollo.io](third_party/apollo-io/) | Cursor | Integrations | Connect to Apollo.io — prospect search, contact and company enrichment, lists, sequences, and one-off emails — via Apollo's official remote MCP server. |
| `ashby` | [Ashby](third_party/ashby/) | Cursor | Integrations | Connect to Ashby — search candidates and jobs, prep for interviews, manage pipeline tasks, and take recruiting actions — via Ashby's official remote MCP server. |
| `hubspot` | [HubSpot](third_party/hubspot/) | Cursor | Integrations | Connect to HubSpot CRM — search and update contacts, companies, deals, and tickets; work with activities, conversations, and marketing emails — via HubSpot's official remote MCP server. |
| `intercom` | [Intercom](third_party/intercom/) | Cursor | Integrations | Connect to Intercom — search conversations and contacts, look up companies, and manage Help Center articles — via Intercom's official remote MCP server. |
| `circleback` | [Circleback](third_party/circleback/) | Cursor | Integrations | Connect to Circleback — search meetings, transcripts, action items, calendar events, and emails, and look up people and companies — via Circleback's official remote MCP server. |
| `docusign` | [Docusign](third_party/docusign/) | Cursor | Integrations | Connect to Docusign — work with eSignature envelopes and templates, Maestro workflows, and Navigator agreements — via Docusign's official remote MCP server (beta). |
| `x` | [X](third_party/x/) | Cursor | Integrations | Read-only access to the X API — search posts and users, read timelines and mentions, and pull trends and news — via X's official hosted MCP server. |
| `navan` | [Navan](third_party/navan/) | Cursor | Integrations | Connect to Navan — query expenses, analyze travel bookings, check policies and approvals, and manage cards — via Navan's official remote MCP server. |
| `profound` | [Profound](third_party/profound/) | Cursor | Integrations | Connect to Profound — retrieve AI visibility, sentiment, and citation reports, access agent analytics, and build or run Profound Agents — via Profound's official hosted MCP server. |
| `uizze` | [UIZZE](uizze/) | UIZZE | Developer Tools | Free anti-ui-slop skill and UI Slop Gate for coding agents; optional MCP adds 800,000+ real web and iOS screens, design contracts, validation, audits, and rendered critique. |
| `juicebox` | [Juicebox](third_party/juicebox/) | Cursor | Integrations | Connect to Juicebox — query recruiting analytics, search shortlists, look up projects, and create or manage sourcing agents — via Juicebox's official remote MCP server. |
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
