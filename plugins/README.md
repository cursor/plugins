# Cursor Plugins

Each plugin provides skills and an MCP server integration following the [Cursor plugin specification](https://www.notion.so/cursorai/Building-Plugins-for-Cursor-2f7da74ef04580228fbbf20ecf477a55).

## Plugin Structure

```
plugin-name/
├── .cursor/
│   └── plugin.json        # Plugin manifest (required)
├── skills/                # Agent skills (directories with SKILL.md)
├── mcp.json               # MCP server definitions
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Available Plugins

| Plugin | Category | Description |
|:-------|:---------|:------------|
| `github` | Developer Tools | Actions, API, CLI, Pull Requests, and repository management |
| `docker` | Developer Tools | Dockerfiles, Compose, multi-stage builds, and containers |
| `launchdarkly` | Developer Tools | Feature flags, experimentation, and progressive rollouts |
| `sentry` | Observability | Error monitoring, performance tracking, and alerting |
| `firebase` | Backend | Firestore, Cloud Functions, Authentication, and Hosting |
| `mongodb` | Backend | Schema design, queries, aggregation, indexes, and Mongoose |
| `twilio` | SaaS | SMS, Voice, WhatsApp, Verify, and communications APIs |
| `slack` | SaaS | Bolt framework, Block Kit, Events API, and app development |
