# Cursor Plugins

Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor-plugin/plugin.json` manifest.

## Plugins

| Plugin | Category | Description |
|:-------|:---------|:------------|
| [GitHub](github/) | Developer Tools | Actions, API, CLI, Pull Requests, and repository management |
| [Docker](docker/) | Developer Tools | Dockerfiles, Compose, multi-stage builds, and containers |
| [LaunchDarkly](launchdarkly/) | Developer Tools | Feature flags, experimentation, and progressive rollouts |
| [Sentry](sentry/) | Observability | Error monitoring, performance tracking, and alerting |
| [Firebase](firebase/) | Backend | Firestore, Cloud Functions, Authentication, and Hosting |
| [MongoDB](mongodb/) | Backend | Schema design, queries, aggregation, indexes, and Mongoose |
| [Twilio](twilio/) | SaaS | SMS, Voice, WhatsApp, Verify, and communications APIs |
| [Slack](slack/) | SaaS | Bolt framework, Block Kit, Events API, and app development |
| [Frontend](frontend/) | Developer Tools | React, TypeScript, accessibility, and performance workflows |
| [Design](design/) | Utilities | UX specs, design systems, handoff, and iteration workflows |
| [Data Science](data-science/) | Utilities | Analysis, modeling, experimentation, and reporting workflows |
| [iOS](ios/) | Developer Tools | Swift, SwiftUI, architecture, and testing workflows |
| [Android](android/) | Developer Tools | Kotlin, Jetpack Compose, architecture, and testing workflows |
| [Planning](planning/) | Utilities | Scope, milestones, risk management, and execution planning |
| [Code Review](code-review/) | Developer Tools | Correctness, security, regression checks, and actionable feedback |
| [Web Browser](web-browser/) | Developer Tools | DevTools-driven debugging, network traces, and repro workflows |
| [Teaching](teaching/) | Utilities | Concept explanations, exercises, and understanding checks |
| [Documentation](documentation/) | Utilities | READMEs, API docs, architecture notes, and changelog writing |
| [Presentation PPTX](presentation-pptx/) | Utilities | Narrative design, slide outlines, and PPTX-ready content |
| [Learning](learning/) | Utilities | Skill maps, practice plans, and feedback loops |
| [Cursor Dev Kit](cursor-dev-kit/) | Developer Tools | Internal-style workflows for CI, code review, shipping, and testing |

## Repository Structure

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
