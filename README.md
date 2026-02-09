# Cursor Plugins

Official Cursor plugins for popular developer tools and SaaS products. Each plugin provides skills and MCP server integrations that work across the IDE, CLI, and Cloud.

## Plugins

| Plugin | Category | Description |
|:-------|:---------|:------------|
| [GitHub](plugins/github/) | Developer Tools | Actions, API, CLI, Pull Requests, and repository management |
| [Docker](plugins/docker/) | Developer Tools | Dockerfiles, Compose, multi-stage builds, and containers |
| [LaunchDarkly](plugins/launchdarkly/) | Developer Tools | Feature flags, experimentation, and progressive rollouts |
| [Sentry](plugins/sentry/) | Observability | Error monitoring, performance tracking, and alerting |
| [Firebase](plugins/firebase/) | Backend | Firestore, Cloud Functions, Authentication, and Hosting |
| [MongoDB](plugins/mongodb/) | Backend | Schema design, queries, aggregation, indexes, and Mongoose |
| [Twilio](plugins/twilio/) | SaaS | SMS, Voice, WhatsApp, Verify, and communications APIs |
| [Slack](plugins/slack/) | SaaS | Bolt framework, Block Kit, Events API, and app development |

## Plugin Structure

Each plugin follows the [Cursor plugin specification](https://www.notion.so/cursorai/Building-Plugins-for-Cursor-2f7da74ef04580228fbbf20ecf477a55):

```
plugin-name/
├── .cursor/
│   └── plugin.json        # Plugin manifest (required)
├── skills/                # Agent skills (SKILL.md with frontmatter)
├── mcp.json               # MCP server definitions
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## License

MIT
